import 'package:dio/dio.dart';
import '../storage/secure_storage_service.dart';

/// Interceptor to automatically attach JWT Bearer tokens to outgoing requests.
class AuthInterceptor extends Interceptor {
  final SecureStorageService _storageService;

  AuthInterceptor(this._storageService);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storageService.getAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    options.headers['Accept'] = 'application/json';
    return handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Invalidate token on 401 Unauthorized
      _storageService.clearAuth();
    }
    return handler.next(err);
  }
}
