import 'package:dio/dio.dart';
import '../constants/api_endpoints.dart';
import '../storage/secure_storage_service.dart';
import 'auth_interceptor.dart';

/// Centralized API HTTP client powered by Dio.
class ApiClient {
  late final Dio dio;
  final SecureStorageService storageService;

  ApiClient({required this.storageService, String? baseUrl}) {
    final effectiveBaseUrl = baseUrl ??
        storageService.getCustomApiUrl() ??
        ApiEndpoints.defaultBaseUrl;

    dio = Dio(
      BaseOptions(
        baseUrl: effectiveBaseUrl,
        connectTimeout: const Duration(seconds: 8),
        receiveTimeout: const Duration(seconds: 8),
        sendTimeout: const Duration(seconds: 8),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(AuthInterceptor(storageService));
  }

  void updateBaseUrl(String newUrl) {
    dio.options.baseUrl = newUrl;
    storageService.setCustomApiUrl(newUrl);
  }
}
