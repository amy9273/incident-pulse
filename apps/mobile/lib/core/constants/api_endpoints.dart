import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

/// Centralized API endpoint configurations.
class ApiEndpoints {
  ApiEndpoints._();

  /// Default API base URL accommodating Android Emulator (10.0.2.2) vs localhost.
  static String get defaultBaseUrl {
    if (kIsWeb) return 'http://localhost:5000';
    try {
      if (Platform.isAndroid) return 'http://10.0.2.2:5000';
    } catch (_) {
      // In case platform is not supported or web
    }
    return 'http://localhost:5000';
  }

  static const String login = '/api/v1/auth/login';
  static const String currentUser = '/api/v1/auth/me';
  static const String incidents = '/api/v1/incidents';
  static const String schedules = '/api/v1/schedules';

  static String incidentDetail(String id) => '/api/v1/incidents/$id';
  static String acknowledgeIncident(String id) =>
      '/api/v1/incidents/$id/acknowledge';
  static String resolveIncident(String id) => '/api/v1/incidents/$id/resolve';
}
