import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/notifications/push_notification_service.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/incidents/presentation/widgets/emergency_alert_banner.dart';

void main() {
  testWidgets(
    'EmergencyAlertBanner displays critical alert info and handles taps',
    (tester) async {
      bool opened = false;
      bool dismissed = false;

      final event = PushAlertEvent(
        id: 'test-evt-01',
        incidentId: 'inc-01',
        title: 'Kafka Consumer Lag Spike',
        severity: 'CRITICAL',
        urgency: 'HIGH',
        serviceName: 'Event Streaming Engine',
        receivedAt: DateTime.now(),
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.darkTheme,
            home: Scaffold(
              body: EmergencyAlertBanner(
                event: event,
                onOpen: () {
                  opened = true;
                },
                onDismiss: () {
                  dismissed = true;
                },
              ),
            ),
          ),
        ),
      );

      // Verify banner content rendered
      expect(find.text('CRITICAL ALERT • 1-TAP TRIAGE'), findsOneWidget);
      expect(find.text('Kafka Consumer Lag Spike'), findsOneWidget);
      expect(find.text('Event Streaming Engine'), findsOneWidget);
      expect(find.text('Acknowledge Now'), findsOneWidget);
      expect(find.text('View Details'), findsOneWidget);

      // Test View Details tap
      await tester.tap(find.text('View Details'));
      await tester.pumpAndSettle();
      expect(opened, isTrue);

      // Test Dismiss tap
      await tester.tap(find.byIcon(Icons.close));
      await tester.pumpAndSettle();
      expect(dismissed, isTrue);
    },
  );
}
