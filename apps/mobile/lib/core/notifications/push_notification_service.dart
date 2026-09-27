import 'dart:async';
import 'package:uuid/uuid.dart';
import 'package:mobile/core/services/haptic_service.dart';

/// Event model representing an incoming emergency push alert (FCM / APNs payload).
class PushAlertEvent {
  final String id;
  final String incidentId;
  final String title;
  final String severity;
  final String urgency;
  final String serviceName;
  final DateTime receivedAt;
  final Map<String, dynamic> payload;
  final String? fingerprint;

  const PushAlertEvent({
    required this.id,
    required this.incidentId,
    required this.title,
    required this.severity,
    required this.urgency,
    required this.serviceName,
    required this.receivedAt,
    this.payload = const {},
    this.fingerprint,
  });

  factory PushAlertEvent.fromJson(Map<String, dynamic> json) {
    return PushAlertEvent(
      id: json['id'] as String? ?? const Uuid().v4(),
      incidentId:
          json['incidentId'] as String? ??
          json['incident_id'] as String? ??
          const Uuid().v4(),
      title: json['title'] as String? ?? 'Incoming Emergency Alert',
      severity: (json['severity'] as String? ?? 'CRITICAL').toUpperCase(),
      urgency: (json['urgency'] as String? ?? 'HIGH').toUpperCase(),
      serviceName:
          json['serviceName'] as String? ??
          json['service_name'] as String? ??
          'Production Service',
      receivedAt: json['receivedAt'] != null
          ? DateTime.parse(json['receivedAt'] as String)
          : DateTime.now(),
      payload: json['payload'] is Map<String, dynamic>
          ? json['payload'] as Map<String, dynamic>
          : {},
      fingerprint: json['fingerprint'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'incidentId': incidentId,
    'title': title,
    'severity': severity,
    'urgency': urgency,
    'serviceName': serviceName,
    'receivedAt': receivedAt.toIso8601String(),
    'payload': payload,
    'fingerprint': fingerprint,
  };

  bool get isCritical => severity == 'CRITICAL' || urgency == 'HIGH';
}

/// Service handling FCM / APNs notifications, background alerts, and heads-up triage banners.
class PushNotificationService {
  final HapticService _hapticService;
  final StreamController<PushAlertEvent> _alertStreamController =
      StreamController<PushAlertEvent>.broadcast();

  String? _deviceToken;
  PushAlertEvent? _activeAlert;

  PushNotificationService({HapticService? hapticService})
    : _hapticService = hapticService ?? const HapticService() {
    _deviceToken = 'fcm_token_sim_${const Uuid().v4().substring(0, 8)}';
  }

  /// Broadcast stream of incoming push alert events.
  Stream<PushAlertEvent> get alertStream => _alertStreamController.stream;

  /// Currently active heads-up alert, if any.
  PushAlertEvent? get activeAlert => _activeAlert;

  /// Simulated / registered push device token.
  String? get deviceToken => _deviceToken;

  /// Ingest an incoming remote notification payload (from FCM or WebSocket).
  Future<PushAlertEvent> handleIncomingPayload(
    Map<String, dynamic> payload,
  ) async {
    final event = PushAlertEvent.fromJson(payload);
    _activeAlert = event;
    _alertStreamController.add(event);

    if (event.isCritical) {
      await _hapticService.criticalAlertImpact();
    }

    return event;
  }

  /// Simulates an incoming P1 critical alert for triage evaluation.
  Future<PushAlertEvent> simulateIncomingAlert({
    String? incidentId,
    String? title,
    String? severity,
    String? serviceName,
  }) async {
    final event = PushAlertEvent(
      id: const Uuid().v4(),
      incidentId: incidentId ?? const Uuid().v4(),
      title: title ?? 'PostgreSQL Primary Node Replication Lag > 5000ms',
      severity: severity ?? 'CRITICAL',
      urgency: 'HIGH',
      serviceName: serviceName ?? 'Payment Gateway DB',
      receivedAt: DateTime.now(),
      payload: {
        'host': 'db-prod-primary-01.internal',
        'metric': 'pg_replication_lag_seconds',
        'value': 5.42,
        'threshold': 1.0,
        'datacenter': 'ap-southeast-1',
      },
    );

    _activeAlert = event;
    _alertStreamController.add(event);
    await _hapticService.criticalAlertImpact();

    return event;
  }

  /// Dismisses the currently active heads-up alert banner.
  void dismissActiveAlert() {
    _activeAlert = null;
  }

  void dispose() {
    _alertStreamController.close();
  }
}
