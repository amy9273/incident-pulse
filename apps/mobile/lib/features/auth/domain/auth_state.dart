import 'auth_user.dart';

/// Immutable authentication state representation.
class AuthState {
  final bool isLoading;
  final AuthUser? user;
  final String? token;
  final String? errorMessage;

  const AuthState({
    this.isLoading = false,
    this.user,
    this.token,
    this.errorMessage,
  });

  bool get isAuthenticated => user != null && token != null;

  factory AuthState.initial() => const AuthState(isLoading: true);

  factory AuthState.unauthenticated() => const AuthState(isLoading: false);

  factory AuthState.loading() => const AuthState(isLoading: true);

  factory AuthState.authenticated({
    required AuthUser user,
    required String token,
  }) =>
      AuthState(isLoading: false, user: user, token: token);

  factory AuthState.error(String message) =>
      AuthState(isLoading: false, errorMessage: message);

  AuthState copyWith({
    bool? isLoading,
    AuthUser? user,
    String? token,
    String? errorMessage,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      user: user ?? this.user,
      token: token ?? this.token,
      errorMessage: errorMessage,
    );
  }
}
