import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/status_badge_widget.dart';

void main() {
  testWidgets('StatusBadgeWidget displays correct label for TRIGGERED status', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.darkTheme,
        home: const Scaffold(
          body: StatusBadgeWidget(status: IncidentStatus.triggered),
        ),
      ),
    );

    expect(find.text('TRIGGERED'), findsOneWidget);
  });

  testWidgets(
    'StatusBadgeWidget displays correct label for ACKNOWLEDGED status',
    (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.darkTheme,
          home: const Scaffold(
            body: StatusBadgeWidget(status: IncidentStatus.acknowledged),
          ),
        ),
      );

      expect(find.text('ACKNOWLEDGED'), findsOneWidget);
    },
  );
}
