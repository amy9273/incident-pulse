import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_keys.dart';

/// Secure and persistent storage service for mobile authentication.
class SecureStorageService {
  final FlutterSecureStorage _secureStorage;
  final SharedPreferences _prefs;

  SecureStorageService({
    FlutterSecureStorage? secureStorage,
    required SharedPreferences prefs,
  })  : _secureStorage = secureStorage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock,
              ),
            ),
        _prefs = prefs;

  // Token management
  Future<void> saveAccessToken(String token) async {
    await _secureStorage.write(key: AppKeys.accessToken, value: token);
  }

  Future<String?> getAccessToken() async {
    return await _secureStorage.read(key: AppKeys.accessToken);
  }

  Future<void> deleteAccessToken() async {
    await _secureStorage.delete(key: AppKeys.accessToken);
  }

  // User cache management
  Future<void> saveUserJson(String jsonStr) async {
    await _prefs.setString(AppKeys.userData, jsonStr);
  }

  String? getUserJson() {
    return _prefs.getString(AppKeys.userData);
  }

  Future<void> deleteUserJson() async {
    await _prefs.remove(AppKeys.userData);
  }

  // Clear all auth state
  Future<void> clearAuth() async {
    await deleteAccessToken();
    await deleteUserJson();
  }

  // Preferences
  String? getCustomApiUrl() {
    return _prefs.getString(AppKeys.customApiUrl);
  }

  Future<void> setCustomApiUrl(String url) async {
    await _prefs.setString(AppKeys.customApiUrl, url);
  }
}
