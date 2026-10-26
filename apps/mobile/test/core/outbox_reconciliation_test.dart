import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/database/app_database.dart';
import 'package:mobile/core/database/tables/incident_table.dart';
import 'package:mobile/core/database/tables/outbox_table.dart';
import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/core/storage/secure_storage_service.dart';
import 'package:mobile/core/sync/outbox_sync_service.dart';
import 'package:mobile/core/widgets/status_badge_widget.dart';
import 'package:mobile/features/incidents/data/incident_local_data_source.dart';
import 'package:mobile/features/incidents/data/incident_remote_data_source.dart';
import 'package:mobile/features/incidents/domain/incident_model.dart';
import 'package:mobile/features/incidents/domain/outbox_action.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

class FakeIncidentRemoteDataSource extends IncidentRemoteDataSource {
  int ackCallCount = 0;
  int resolveCallCount = 0;
  ApiException? errorToThrow;

  FakeIncidentRemoteDataSource()
      : super(ApiClient(storageService: FakeSecureStorageService()));

  @override
  Future<void> acknowledgeIncident(String id) async {
    ackCallCount++;
    if (errorToThrow != null) {
      throw errorToThrow!;
    }
  }

  @override
  Future<void> resolveIncident(String id, {String? resolutionNote}) async {
    resolveCallCount++;
    if (errorToThrow != null) {
      throw errorToThrow!;
    }
  }
}

class FakeSecureStorageService extends Fake implements SecureStorageService {
  @override
  String? getCustomApiUrl() => 'http://localhost:4000';
  @override
  Future<String?> getAccessToken() async => 'fake-token';
}

void main() {
  sqfliteFfiInit();
  databaseFactory = databaseFactoryFfi;

  late Database db;
  late AppDatabase appDatabase;
  late IncidentLocalDataSource localDataSource;
  late FakeIncidentRemoteDataSource remoteDataSource;
  late OutboxSyncService outboxSyncService;

  setUp(() async {
    db = await databaseFactory.openDatabase(inMemoryDatabasePath);
    await db.execute(IncidentTable.createTableSql);
    await db.execute(OutboxTable.createTableSql);

    appDatabase = AppDatabase(db: db);
    localDataSource = IncidentLocalDataSource(appDatabase);
    remoteDataSource = FakeIncidentRemoteDataSource();
    outboxSyncService = OutboxSyncService(
      localDataSource: localDataSource,
      remoteDataSource: remoteDataSource,
    );
  });

  tearDown(() async {
    await db.close();
  });

  group('Offline Outbox Reconciliation & Dead-Letter Handling (DEF-09)', () {
    test(
        'successful sync drains pending action, deletes outbox row, and marks incident synced',
        () async {
      // 1. Setup local incident & queued acknowledge action
      final incident = IncidentModel(
        id: 'inc-sync-01',
        title: 'Offline Sync Success Test',
        status: IncidentStatus.acknowledged,
        urgency: 'HIGH',
        serviceId: 'svc-1',
        serviceName: 'Payment API',
        fingerprint: 'fp-sync-01',
        isLocallyUpdated: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
      await db.insert(IncidentTable.tableName, incident.toSqlite());

      final action = OutboxAction(
        id: 'outbox-sync-01',
        incidentId: 'inc-sync-01',
        action: OutboxActionType.acknowledge,
        createdAt: DateTime.now(),
        status: OutboxStatus.pending,
      );
      await db.insert(OutboxTable.tableName, action.toSqlite());

      // 2. Perform sync
      final syncedCount = await outboxSyncService.syncOutbox();

      expect(syncedCount, equals(1));
      expect(remoteDataSource.ackCallCount, equals(1));

      // 3. Verify outbox is drained
      final remainingPending = await localDataSource.getPendingOutboxActions();
      expect(remainingPending.isEmpty, isTrue);

      // 4. Verify local incident update lock is cleared
      final updatedIncident =
          await localDataSource.getIncidentById('inc-sync-01');
      expect(updatedIncident?.isLocallyUpdated, isFalse);
    });

    test(
        'terminal 403 Forbidden marks action as FAILED without infinite retry (DEF-09)',
        () async {
      final incident = IncidentModel(
        id: 'inc-term-01',
        title: 'Forbidden Incident Test',
        status: IncidentStatus.acknowledged,
        urgency: 'HIGH',
        serviceId: 'svc-1',
        serviceName: 'Payment API',
        fingerprint: 'fp-term-01',
        isLocallyUpdated: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
      await db.insert(IncidentTable.tableName, incident.toSqlite());

      final action = OutboxAction(
        id: 'outbox-term-01',
        incidentId: 'inc-term-01',
        action: OutboxActionType.acknowledge,
        createdAt: DateTime.now(),
        status: OutboxStatus.pending,
      );
      await db.insert(OutboxTable.tableName, action.toSqlite());

      // Simulate 403 Forbidden from backend
      remoteDataSource.errorToThrow =
          ApiException('Forbidden: Viewer cannot acknowledge', statusCode: 403);

      // 1. First sync cycle
      final syncedCount = await outboxSyncService.syncOutbox();
      expect(syncedCount, equals(0));

      // 2. Outbox action should be marked FAILED
      final failedActions = await localDataSource.getFailedOutboxActions();
      expect(failedActions.length, equals(1));
      expect(failedActions.first.status, equals(OutboxStatus.failed));
      expect(failedActions.first.lastError, contains('Forbidden'));
      expect(failedActions.first.retryCount, equals(1));

      // 3. Normal pending queue must be empty so background sync does not deadlock
      final pendingActions = await localDataSource.getPendingOutboxActions();
      expect(pendingActions.isEmpty, isTrue);

      // 4. Local optimistic lock should be cleared so true server state can be fetched
      final updatedIncident =
          await localDataSource.getIncidentById('inc-term-01');
      expect(updatedIncident?.isLocallyUpdated, isFalse);
    });

    test(
        'transient network failure retries until maxRetries then enters Dead-Letter Queue',
        () async {
      final action = OutboxAction(
        id: 'outbox-retry-01',
        incidentId: 'inc-retry-01',
        action: OutboxActionType.acknowledge,
        createdAt: DateTime.now(),
        status: OutboxStatus.pending,
        retryCount: 4, // 4 retries already performed
      );
      await db.insert(OutboxTable.tableName, action.toSqlite());

      // Simulate network timeout (transient error, statusCode = null)
      remoteDataSource.errorToThrow = ApiException('Connection timed out');

      await outboxSyncService.syncOutbox();

      // Because nextRetry = 5 >= maxRetries (5), status should transition to FAILED
      final failedActions = await localDataSource.getFailedOutboxActions();
      expect(failedActions.length, equals(1));
      expect(failedActions.first.status, equals(OutboxStatus.failed));
      expect(failedActions.first.retryCount, equals(5));

      // Should no longer be in pending
      final pending = await localDataSource.getPendingOutboxActions();
      expect(pending.isEmpty, isTrue);
    });
  });
}
