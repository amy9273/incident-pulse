import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/primary_button.dart';
import 'package:mobile/core/widgets/status_badge_widget.dart';
import 'package:mobile/features/incidents/domain/incident_model.dart';
import 'package:mobile/features/incidents/presentation/screens/incident_detail_screen.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  final testIncident = IncidentModel(
    id: 'inc-detail-test-12345678',
    title: 'High Disk I/O Saturation on Primary Shard',
    serviceId: 'srv-db',
    serviceName: 'Core Shard Cluster',
    status: IncidentStatus.triggered,
    urgency: 'HIGH',
    fingerprint: 'fp-io-sat',
    createdAt: DateTime.now().subtract(const Duration(minutes: 3)),
    updatedAt: DateTime.now().subtract(const Duration(minutes: 3)),
    payload: {
      'device': '/dev/nvme0n1',
      'utilization_percent': 99.8,
      'iops': 45200,
    },
  );

  testWidgets(
    'IncidentDetailScreen renders high-contrast UI, timeline, and 56dp action buttons',
    (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.darkTheme,
            home: IncidentDetailScreen(incident: testIncident),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Verify Title & Service
      expect(
        find.text('High Disk I/O Saturation on Primary Shard'),
        findsOneWidget,
      );
      expect(find.text('Core Shard Cluster'), findsOneWidget);

      // Verify SLA / Escalation card
      expect(
        find.text('Tier 1 Escalation Active (SLA Running)'),
        findsOneWidget,
      );

      // Verify Raw Payload & Audit widgets exist
      expect(find.text('Raw Alert Payload'), findsOneWidget);
      expect(find.text('Audit Timeline & Lifecycle'), findsOneWidget);

      // Verify Acknowledge button has >= 56dp touch height
      final ackButtonFinder = find.widgetWithText(PrimaryButton, 'Acknowledge');
      expect(ackButtonFinder, findsOneWidget);

      final ackSize = tester.getSize(ackButtonFinder);
      expect(ackSize.height, greaterThanOrEqualTo(56.0));

      // Verify Resolve button exists
      expect(find.text('Resolve'), findsOneWidget);
    },
  );

  testWidgets(
    'IncidentDetailScreen in ACKNOWLEDGED state shows Resolve Incident primary button',
    (tester) async {
      final ackIncident = testIncident.copyWith(
        status: IncidentStatus.acknowledged,
        acknowledgedAt: DateTime.now(),
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.darkTheme,
            home: IncidentDetailScreen(incident: ackIncident),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Resolve Incident'), findsOneWidget);
      expect(find.text('Acknowledge'), findsNothing);
    },
  );

  testWidgets(
    'IncidentDetailScreen in RESOLVED state shows resolved completion banner',
    (tester) async {
      final resIncident = testIncident.copyWith(
        status: IncidentStatus.resolved,
        resolvedAt: DateTime.now(),
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.darkTheme,
            home: IncidentDetailScreen(incident: resIncident),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Incident Resolved'), findsWidgets);
      expect(find.byType(PrimaryButton), findsNothing);
    },
  );
}
