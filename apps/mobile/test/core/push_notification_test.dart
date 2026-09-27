import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/notifications/push_notification_service.dart';

void main() {
  group('PushAlertEvent Model & Serialization', () {
    test('parses FCM/APNs remote notification payload correctly', () {
      final json = {
        'id': 'evt-12345',
        'incidentId': 'inc-99999',
        'title': 'High Memory Usage on API Gateway',
        'severity': 'CRITICAL',
        'urgency': 'HIGH',
        'serviceName': 'API Gateway',
        'receivedAt': '2026-09-28T04:00:00.000Z',
        'payload': {'memory_percent': 98.4, 'host': 'api-gw-01'},
        'fingerprint': 'sha256-fingerprint-test',
      };

      final event = PushAlertEvent.fromJson(json);

      expect(event.id, equals('evt-12345'));
      expect(event.incidentId, equals('inc-99999'));
      expect(event.title, equals('High Memory Usage on API Gateway'));
      expect(event.severity, equals('CRITICAL'));
      expect(event.urgency, equals('HIGH'));
      expect(event.serviceName, equals('API Gateway'));
      expect(event.isCritical, isTrue);
      expect(event.payload['memory_percent'], equals(98.4));
      expect(event.fingerprint, equals('sha256-fingerprint-test'));
    });

    test('serializes to JSON correctly', () {
      final event = PushAlertEvent(
        id: 'evt-test',
        incidentId: 'inc-test',
        title: 'Redis Cluster Unreachable',
        severity: 'CRITICAL',
        urgency: 'HIGH',
        serviceName: 'Session Cache',
        receivedAt: DateTime.parse('2026-09-28T04:15:00.000Z'),
        payload: {'cluster': 'redis-prod'},
      );

      final json = event.toJson();
      expect(json['id'], equals('evt-test'));
      expect(json['incidentId'], equals('inc-test'));
      expect(json['title'], equals('Redis Cluster Unreachable'));
      expect(json['severity'], equals('CRITICAL'));
      expect(json['urgency'], equals('HIGH'));
      expect(json['serviceName'], equals('Session Cache'));
    });
  });

  group('PushNotificationService', () {
    late PushNotificationService service;

    setUp(() {
      service = PushNotificationService();
    });

    tearDown(() {
      service.dispose();
    });

    test('generates a valid device token upon initialization', () {
      expect(service.deviceToken, isNotNull);
      expect(service.deviceToken, startsWith('fcm_token_sim_'));
    });

    test('emits incoming push alert via stream', () async {
      final incoming = {
        'id': 'evt-stream-1',
        'incidentId': 'inc-stream-1',
        'title': 'PostgreSQL Slow Query Rate Exceeded',
        'severity': 'CRITICAL',
        'urgency': 'HIGH',
        'serviceName': 'Order Service DB',
      };

      expectLater(
        service.alertStream,
        emits(
          isA<PushAlertEvent>()
              .having((e) => e.incidentId, 'incidentId', 'inc-stream-1')
              .having((e) => e.title, 'title', contains('PostgreSQL')),
        ),
      );

      await service.handleIncomingPayload(incoming);
      expect(service.activeAlert, isNotNull);
      expect(service.activeAlert!.incidentId, equals('inc-stream-1'));
    });

    test('simulateIncomingAlert triggers emergency event', () async {
      expectLater(
        service.alertStream,
        emits(
          isA<PushAlertEvent>().having(
            (e) => e.serviceName,
            'serviceName',
            'Payment Gateway DB',
          ),
        ),
      );

      final simulated = await service.simulateIncomingAlert();
      expect(simulated.isCritical, isTrue);
      expect(service.activeAlert, equals(simulated));

      service.dismissActiveAlert();
      expect(service.activeAlert, isNull);
    });
  });
}
