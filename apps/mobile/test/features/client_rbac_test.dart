import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/primary_button.dart';
import 'package:mobile/core/widgets/status_badge_widget.dart';
import 'package:mobile/features/incidents/domain/incident_model.dart';
import 'package:mobile/features/incidents/presentation/screens/incident_detail_screen.dart';
import 'package:mobile/features/incidents/presentation/widgets/incident_card_widget.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  final testIncident = IncidentModel(
    id: 'inc-rbac-test-01',
    title: 'High CPU Saturation on Worker Pod',
    serviceId: 'srv-worker',
    serviceName: 'Background Ingestion Worker',
    status: IncidentStatus.triggered,
    urgency: 'HIGH',
    fingerprint: 'fp-cpu-worker',
    createdAt: DateTime.now().subtract(const Duration(minutes: 5)),
    updatedAt: DateTime.now().subtract(const Duration(minutes: 5)),
  );

  group('Client-Side RBAC Guard Ergonomics (DEF-12)', () {
    testWidgets(
        'IncidentCardWidget with isReadOnly=true renders Read-Only badge and hides triage buttons',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.darkTheme,
          home: Scaffold(
            body: IncidentCardWidget(
              incident: testIncident,
              isReadOnly: true,
              onAcknowledge: () {},
              onResolve: () {},
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Verify Read-Only badge is rendered
      expect(find.text('Read-Only (Viewer)'), findsOneWidget);

      // Verify Acknowledge button is NOT rendered
      expect(find.text('Acknowledge Incident'), findsNothing);

      // Verify Dismissible swipe widget is NOT present
      expect(find.byType(Dismissible), findsNothing);
    });

    testWidgets(
        'IncidentDetailScreen with isReadOnly=true displays read-only indicator instead of action buttons',
        (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.darkTheme,
            home: IncidentDetailScreen(
              incident: testIncident,
              isReadOnly: true,
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Verify Read-Only indicator is shown in sticky bottom action bar
      expect(find.text('Read-Only Access (Viewer)'), findsOneWidget);

      // Verify Acknowledge and Resolve buttons are NOT rendered
      expect(find.widgetWithText(PrimaryButton, 'Acknowledge'), findsNothing);
      expect(find.widgetWithText(OutlinedButton, 'Resolve'), findsNothing);
    });
  });
}
