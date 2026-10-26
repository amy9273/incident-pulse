import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/database/app_database.dart';
import '../../../../core/database/database_provider.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/realtime/socket_provider.dart';
import '../../../../core/realtime/socket_service.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../../data/auth_remote_data_source.dart';
import '../../data/auth_repository_impl.dart';
import '../../domain/auth_state.dart';
import '../../domain/i_auth_repository.dart';

/// Demo user profiles for fast 1-tap testing in mobile environments.
class DemoProfile {
  final String label;
  final String email;
  final String password;
  final String role;
  final String description;

  const DemoProfile({
    required this.label,
    required this.email,
    required this.password,
    required this.role,
    required this.description,
  });
}

const List<DemoProfile> demoProfiles = [
  DemoProfile(
    label: 'Sarah (On-Call)',
    email: 'sarah.chen@incidentpulse.io',
    password: 'ResponderPassword123!',
    role: 'RESPONDER',
    description: 'Tier 1 Primary Responder',
  ),
  DemoProfile(
    label: 'Alex (Secondary)',
    email: 'alex.kumar@incidentpulse.io',
    password: 'ResponderPassword123!',
    role: 'RESPONDER',
    description: 'Tier 2 Secondary Responder',
  ),
  DemoProfile(
    label: 'Admin',
    email: 'admin@incidentpulse.io',
    password: 'AdminPassword123!',
    role: 'ADMIN',
    description: 'Platform Admin',
  ),
  DemoProfile(
    label: 'Viewer',
    email: 'viewer@incidentpulse.io',
    password: 'Password123!',
    role: 'VIEWER',
    description: 'Read-only Stakeholder',
  ),
];

// Riverpod Providers
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('Initialize sharedPreferencesProvider in main()');
});

final secureStorageServiceProvider = Provider<SecureStorageService>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return SecureStorageService(prefs: prefs);
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(secureStorageServiceProvider);
  return ApiClient(storageService: storage);
});

final authRemoteDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  final client = ref.watch(apiClientProvider);
  return AuthRemoteDataSource(client);
});

final authRepositoryProvider = Provider<IAuthRepository>((ref) {
  final remote = ref.watch(authRemoteDataSourceProvider);
  final storage = ref.watch(secureStorageServiceProvider);
  return AuthRepositoryImpl(remoteDataSource: remote, storageService: storage);
});

class AuthController extends StateNotifier<AuthState> {
  final IAuthRepository _repository;
  final AppDatabase? _appDatabase;
  final SocketService? _socketService;

  AuthController(
    this._repository, {
    AppDatabase? appDatabase,
    SocketService? socketService,
  })  : _appDatabase = appDatabase,
        _socketService = socketService,
        super(AuthState.initial()) {
    checkAuth();
  }

  Future<void> checkAuth() async {
    state = AuthState.loading();
    final result = await _repository.checkAuthStatus();
    state = result;
  }

  Future<bool> login({required String email, required String password}) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final result = await _repository.login(email: email, password: password);
    state = result;
    return result.isAuthenticated;
  }

  /// Safe Logout Pipeline (DEF-11):
  /// 1. Terminate WebSocket subscriptions
  /// 2. Clear tokens from secure enclave / keychain
  /// 3. Purge cached incidents & pending outbox actions from local SQLite
  /// 4. Reset authentication state
  Future<void> logout() async {
    state = AuthState.loading();
    _socketService?.disconnect();
    await _repository.logout();
    await _appDatabase?.clearAllData();
    state = AuthState.unauthenticated();
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) {
    final repo = ref.watch(authRepositoryProvider);
    final appDb = ref.watch(appDatabaseProvider);
    final socket = ref.watch(socketServiceProvider);
    return AuthController(
      repo,
      appDatabase: appDb,
      socketService: socket,
    );
  },
);
