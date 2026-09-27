import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/widgets/status_badge_widget.dart';
import 'package:mobile/features/incidents/domain/incident_model.dart';

void main() {
  group('IncidentModel Domain Parsing & Serialization', () {
    test('parses from backend REST JSON payload', () {
      final json = {
        'id': 'inc-999',
        'title': '500 Internal Server Error Spike',
        'summary': 'API Gateway experiencing elevated 5xx error rate',
        'status': 'TRIGGERED',
        'urgency': 'HIGH',
        'serviceId': 'svc-api-01',
        'service': {'id': 'svc-api-01', 'name': 'Public API Gateway'},
        'fingerprint': 'fp-abc-123',
        'alertCount': 5,
        'createdAt': '2026-09-28T04:00:00.000Z',
        'updatedAt': '2026-09-28T04:05:00.000Z',
      };

      final incident = IncidentModel.fromJson(json);

      expect(incident.id, equals('inc-999'));
      expect(incident.title, equals('500 Internal Server Error Spike'));
      expect(incident.status, equals(IncidentStatus.triggered));
      expect(incident.serviceName, equals('Public API Gateway'));
      expect(incident.alertCount, equals(5));
      expect(incident.isLocallyUpdated, isFalse);
    });

    test('serializes to SQLite and back without data loss', () {
      final original = IncidentModel(
        id: 'inc-roundtrip',
        title: 'CPU Saturation on Worker 04',
        status: IncidentStatus.acknowledged,
        urgency: 'HIGH',
        serviceId: 'svc-worker',
        serviceName: 'Escalation Worker',
        fingerprint: 'fp-worker-4',
        alertCount: 2,
        acknowledgedAt: DateTime.parse('2026-09-28T04:10:00.000Z'),
        createdAt: DateTime.parse('2026-09-28T04:00:00.000Z'),
        updatedAt: DateTime.parse('2026-09-28T04:10:00.000Z'),
        isLocallyUpdated: true,
      );

      final sqliteMap = original.toSqlite();
      final roundtrip = IncidentModel.fromSqlite(sqliteMap);

      expect(roundtrip.id, equals(original.id));
      expect(roundtrip.title, equals(original.title));
      expect(roundtrip.status, equals(original.status));
      expect(roundtrip.isLocallyUpdated, isTrue);
      expect(roundtrip.acknowledgedAt, equals(original.acknowledgedAt));
    });
  });
}
