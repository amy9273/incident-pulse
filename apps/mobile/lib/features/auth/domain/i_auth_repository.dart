import 'auth_state.dart';
import 'auth_user.dart';

/// Contract interface for authentication operations.
abstract class IAuthRepository {
  Future<AuthState> login({required String email, required String password});

  Future<void> logout();

  Future<AuthState> checkAuthStatus();

  AuthUser? getCachedUser();

  Future<String?> getAccessToken();
}
