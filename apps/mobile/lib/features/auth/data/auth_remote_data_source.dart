import 'package:dio/dio.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../domain/auth_user.dart';

/// Response payload from login endpoint.
class LoginResponseDto {
  final String token;
  final AuthUser user;

  const LoginResponseDto({required this.token, required this.user});

  factory LoginResponseDto.fromJson(Map<String, dynamic> json) {
    return LoginResponseDto(
      token: json['token'] as String,
      user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}

/// Remote data source calling authentication REST endpoints.
class AuthRemoteDataSource {
  final ApiClient _apiClient;

  AuthRemoteDataSource(this._apiClient);

  Future<LoginResponseDto> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _apiClient.dio.post<Map<String, dynamic>>(
        ApiEndpoints.login,
        data: {'email': email.trim().toLowerCase(), 'password': password},
      );

      final data = response.data;
      if (data == null) {
        throw Exception('Server returned an empty response.');
      }

      return LoginResponseDto.fromJson(data);
    } on DioException catch (e) {
      final errorMsg = e.response?.data is Map<String, dynamic>
          ? (e.response!.data as Map<String, dynamic>)['message'] as String? ??
                'Authentication failed'
          : e.message ?? 'Network connection error';
      throw Exception(errorMsg);
    }
  }

  Future<AuthUser> fetchCurrentUser() async {
    try {
      final response = await _apiClient.dio.get<Map<String, dynamic>>(
        ApiEndpoints.currentUser,
      );

      final data = response.data;
      if (data == null || data['user'] == null) {
        throw Exception('Failed to fetch user profile.');
      }

      return AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      final errorMsg = e.response?.data is Map<String, dynamic>
          ? (e.response!.data as Map<String, dynamic>)['message'] as String? ??
                'Failed to fetch user'
          : e.message ?? 'Network error';
      throw Exception(errorMsg);
    }
  }
}
