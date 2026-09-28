import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/database/tables/incident_table.dart';
import 'package:mobile/core/database/tables/outbox_table.dart';
import 'package:mobile/core/widgets/status_badge_widget.dart';
import 'package:mobile/features/incidents/domain/incident_model.dart';
import 'package:mobile/features/incidents/domain/outbox_action.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  // Initialize FFI for headless desktop/CLI unit tests
  sqfliteFfiInit();
  databaseFactory = databaseFactoryFfi;

  late Database db;

  setUp(() async {
    db = await databaseFactory.openDatabase(inMemoryDatabasePath);
    await db.execute(IncidentTable.createTableSql);
    await db.execute(OutboxTable.createTableSql);
  });

  tearDown(() async {
    await db.close();
  });

  group('SQLite Cache & Transactional Outbox', () {
    test('inserts and retrieves incidents from SQLite cache', () async {
      final incident = IncidentModel(
        id: 'inc-test-01',
        title: 'High Latency Alert',
        status: IncidentStatus.triggered,
        urgency: 'HIGH',
        serviceId: 'svc-01',
        serviceName: 'Payment Gateway',
        fingerprint: 'fp-sha256-12345',
        alertCount: 3,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      await db.insert(IncidentTable.tableName, incident.toSqlite());

      final rows = await db.query(IncidentTable.tableName);
      expect(rows.length, equals(1));

      final retrieved = IncidentModel.fromSqlite(rows.first);
      expect(retrieved.id, equals('inc-test-01'));
      expect(retrieved.title, equals('High Latency Alert'));
      expect(retrieved.status, equals(IncidentStatus.triggered));
      expect(retrieved.serviceName, equals('Payment Gateway'));
      expect(retrieved.isLocallyUpdated, isFalse);
    });

    test(
      'atomic transactional acknowledge updates status and inserts outbox record',
      () async {
        final now = DateTime.now();
        final incident = IncidentModel(
          id: 'inc-test-02',
          title: 'Redis Memory Spike',
          status: IncidentStatus.triggered,
          urgency: 'HIGH',
          serviceId: 'svc-02',
          serviceName: 'Session Store',
          fingerprint: 'fp-sha256-67890',
          createdAt: now,
          updatedAt: now,
        );

        await db.insert(IncidentTable.tableName, incident.toSqlite());

        // Execute atomic transaction (Invariant #3 & Invariant #5)
        const outboxId = 'outbox-uuid-01';
        await db.transaction((txn) async {
          await txn.update(
            IncidentTable.tableName,
            {
              IncidentTable.colStatus:
                  IncidentStatus.acknowledged.name.toUpperCase(),
              IncidentTable.colAcknowledgedAt: now.toIso8601String(),
              IncidentTable.colUpdatedAt: now.toIso8601String(),
              IncidentTable.colIsLocallyUpdated: 1,
            },
            where: '${IncidentTable.colId} = ?',
            whereArgs: ['inc-test-02'],
          );

          await txn.insert(OutboxTable.tableName, {
            OutboxTable.colId: outboxId,
            OutboxTable.colIncidentId: 'inc-test-02',
            OutboxTable.colAction: OutboxActionType.acknowledge.toDbString(),
            OutboxTable.colPayload: null,
            OutboxTable.colCreatedAt: now.toIso8601String(),
            OutboxTable.colStatus: OutboxStatus.pending.toDbString(),
            OutboxTable.colRetryCount: 0,
            OutboxTable.colLastError: null,
          });
        });

        // Verify incident updated
        final updatedRows = await db.query(
          IncidentTable.tableName,
          where: '${IncidentTable.colId} = ?',
          whereArgs: ['inc-test-02'],
        );
        final updatedIncident = IncidentModel.fromSqlite(updatedRows.first);
        expect(updatedIncident.status, equals(IncidentStatus.acknowledged));
        expect(updatedIncident.isLocallyUpdated, isTrue);

        // Verify outbox record exists
        final outboxRows = await db.query(OutboxTable.tableName);
        expect(outboxRows.length, equals(1));
        final outboxAction = OutboxAction.fromSqlite(outboxRows.first);
        expect(outboxAction.id, equals(outboxId));
        expect(outboxAction.incidentId, equals('inc-test-02'));
        expect(outboxAction.action, equals(OutboxActionType.acknowledge));
        expect(outboxAction.status, equals(OutboxStatus.pending));
      },
    );
  });
}
