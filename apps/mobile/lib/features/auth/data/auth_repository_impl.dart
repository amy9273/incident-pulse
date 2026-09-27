import '../../../core/storage/secure_storage_service.dart';
import '../domain/auth_state.dart';
import '../domain/auth_user.dart';
import '../domain/i_auth_repository.dart';
import 'auth_remote_data_source.dart';

/// Concrete implementation of IAuthRepository.
class AuthRepositoryImpl implements IAuthRepository {
  final AuthRemoteDataSource _remoteDataSource;
  final SecureStorageService _storageService;

  AuthRepositoryImpl({
    required AuthRemoteDataSource remoteDataSource,
    required SecureStorageService storageService,
  }) : _remoteDataSource = remoteDataSource,
       _storageService = storageService;

  @override
  Future<AuthState> login({
    required String email,
    required String password,
  }) async {
    try {
      final result = await _remoteDataSource.login(
        email: email,
        password: password,
      );

      // Persist access token and user cache securely
      await _storageService.saveAccessToken(result.token);
      await _storageService.saveUserJson(result.user.toJsonString());

      return AuthState.authenticated(user: result.user, token: result.token);
    } catch (e) {
      return AuthState.error(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  @override
  Future<void> logout() async {
    await _storageService.clearAuth();
  }

  @override
  Future<AuthState> checkAuthStatus() async {
    try {
      final token = await _storageService.getAccessToken();
      if (token == null || token.isEmpty) {
        return AuthState.unauthenticated();
      }

      // First check local cache
      final cachedJson = _storageService.getUserJson();
      AuthUser? localUser;
      if (cachedJson != null) {
        try {
          localUser = AuthUser.fromJsonString(cachedJson);
        } catch (_) {}
      }

      // Try fetching fresh profile from API
      try {
        final freshUser = await _remoteDataSource.fetchCurrentUser();
        await _storageService.saveUserJson(freshUser.toJsonString());
        return AuthState.authenticated(user: freshUser, token: token);
      } catch (_) {
        // If offline but we have cached token & user, restore session
        if (localUser != null) {
          return AuthState.authenticated(user: localUser, token: token);
        }
        return AuthState.unauthenticated();
      }
    } catch (e) {
      return AuthState.unauthenticated();
    }
  }

  @override
  AuthUser? getCachedUser() {
    final cached = _storageService.getUserJson();
    if (cached == null) return null;
    try {
      return AuthUser.fromJsonString(cached);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<String?> getAccessToken() async {
    return await _storageService.getAccessToken();
  }
}
