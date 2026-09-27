import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/domain/auth_user.dart';

void main() {
  group('AuthUser Domain Model', () {
    test('serializes and deserializes from JSON correctly', () {
      final json = {
        'id': 'usr-12345',
        'email': 'sarah@incidentpulse.io',
        'name': 'Sarah Chen',
        'role': 'RESPONDER',
        'createdAt': '2026-09-28T00:00:00.000Z',
      };

      final user = AuthUser.fromJson(json);

      expect(user.id, equals('usr-12345'));
      expect(user.email, equals('sarah@incidentpulse.io'));
      expect(user.name, equals('Sarah Chen'));
      expect(user.role, equals('RESPONDER'));
      expect(user.createdAt, isNotNull);

      final exported = user.toJson();
      expect(exported['id'], equals('usr-12345'));
      expect(exported['email'], equals('sarah@incidentpulse.io'));
    });
  });
}
