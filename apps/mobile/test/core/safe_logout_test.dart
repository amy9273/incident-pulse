import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/database/app_database.dart';
import 'package:mobile/core/database/tables/incident_table.dart';
import 'package:mobile/core/database/tables/outbox_table.dart';
import 'package:mobile/core/notifications/push_notification_service.dart';
import 'package:mobile/core/realtime/socket_service.dart';
import 'package:mobile/core/widgets/status_badge_widget.dart';
import 'package:mobile/features/auth/domain/auth_state.dart';
import 'package:mobile/features/auth/domain/auth_user.dart';
import 'package:mobile/features/auth/domain/i_auth_repository.dart';
import 'package:mobile/features/auth/presentation/controllers/auth_controller.dart';
import 'package:mobile/features/incidents/domain/incident_model.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

class FakeAuthRepository implements IAuthRepository {
  bool logoutCalled = false;
  AuthUser? user;

  @override
  Future<AuthState> checkAuthStatus() async {
    if (user != null) {
      return AuthState.authenticated(user: user!, token: 'fake-jwt-token');
    }
    return AuthState.unauthenticated();
  }

  @override
  Future<AuthState> login({
    required String email,
    required String password,
  }) async {
    user = const AuthUser(
      id: 'usr-1',
      email: 'test@incidentpulse.io',
      name: 'Test Responder',
      role: 'RESPONDER',
    );
    return AuthState.authenticated(user: user!, token: 'fake-jwt-token');
  }

  @override
  Future<void> logout() async {
    logoutCalled = true;
    user = null;
  }

  @override
  AuthUser? getCachedUser() => user;

  @override
  Future<String?> getAccessToken() async =>
      user != null ? 'fake-jwt-token' : null;
}

class FakePushNotificationService extends PushNotificationService {}

void main() {
  sqfliteFfiInit();
  databaseFactory = databaseFactoryFfi;

  late Database db;
  late AppDatabase appDatabase;
  late FakeAuthRepository authRepo;
  late SocketService socketService;

  setUp(() async {
    db = await databaseFactory.openDatabase(inMemoryDatabasePath);
    await db.execute(IncidentTable.createTableSql);
    await db.execute(OutboxTable.createTableSql);
    appDatabase = AppDatabase(db: db);
    authRepo = FakeAuthRepository();
    socketService = SocketService(
      notificationService: FakePushNotificationService(),
    );
  });

  tearDown(() async {
    await db.close();
  });

  group('Safe Logout & Local State Purge (DEF-11)', () {
    test(
        'AppDatabase.clearAllData() purges all cached incidents and outbox rows',
        () async {
      // 1. Populate tables
      final incident = IncidentModel(
        id: 'inc-purge-01',
        title: 'Cache Purge Test',
        status: IncidentStatus.triggered,
        urgency: 'HIGH',
        serviceId: 'svc-1',
        serviceName: 'Auth Service',
        fingerprint: 'fp-1',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
      await db.insert(IncidentTable.tableName, incident.toSqlite());

      await db.insert(OutboxTable.tableName, {
        OutboxTable.colId: 'outbox-1',
        OutboxTable.colIncidentId: 'inc-purge-01',
        OutboxTable.colAction: 'ACKNOWLEDGE',
        OutboxTable.colPayload: null,
        OutboxTable.colCreatedAt: DateTime.now().toIso8601String(),
        OutboxTable.colStatus: 'PENDING',
        OutboxTable.colRetryCount: 0,
        OutboxTable.colLastError: null,
      });

      // Verify row counts
      var incidents = await db.query(IncidentTable.tableName);
      var outbox = await db.query(OutboxTable.tableName);
      expect(incidents.length, equals(1));
      expect(outbox.length, equals(1));

      // 2. Perform clearAllData()
      await appDatabase.clearAllData();

      // 3. Verify both tables are empty
      incidents = await db.query(IncidentTable.tableName);
      outbox = await db.query(OutboxTable.tableName);
      expect(incidents.isEmpty, isTrue);
      expect(outbox.isEmpty, isTrue);
    });

    test('AuthController.logout() executes entire teardown pipeline', () async {
      final controller = AuthController(
        authRepo,
        appDatabase: appDatabase,
        socketService: socketService,
      );

      // Authenticate
      await controller.login(
        email: 'test@incidentpulse.io',
        password: 'Password123!',
      );
      expect(controller.state.isAuthenticated, isTrue);

      // Insert an incident in database to verify it gets wiped
      await db.insert(
        IncidentTable.tableName,
        IncidentModel(
          id: 'inc-logout-01',
          title: 'Secret Incident Data',
          status: IncidentStatus.triggered,
          urgency: 'HIGH',
          serviceId: 'svc-2',
          serviceName: 'Database',
          fingerprint: 'fp-2',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        ).toSqlite(),
      );

      // Execute logout
      await controller.logout();

      // Verify AuthController state is unauthenticated
      expect(controller.state.isAuthenticated, isFalse);
      expect(authRepo.logoutCalled, isTrue);

      // Verify local database state is completely purged
      final remainingIncidents = await db.query(IncidentTable.tableName);
      expect(remainingIncidents.isEmpty, isTrue);
    });
  });
}
