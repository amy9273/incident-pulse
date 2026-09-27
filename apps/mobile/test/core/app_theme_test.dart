import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/theme/app_colors.dart';
import 'package:mobile/core/theme/app_theme.dart';

void main() {
  group('AppTheme & Semantic Colors', () {
    test(
      'Dark theme contains AppThemeColors extension with correct tokens',
      () {
        final theme = AppTheme.darkTheme;
        final extension = theme.extension<AppThemeColors>();

        expect(extension, isNotNull);
        expect(extension!.triggered, equals(AppColors.triggered));
        expect(extension.acknowledged, equals(AppColors.acknowledged));
        expect(extension.resolved, equals(AppColors.resolved));
      },
    );

    test(
      'Light theme contains AppThemeColors extension with correct tokens',
      () {
        final theme = AppTheme.lightTheme;
        final extension = theme.extension<AppThemeColors>();

        expect(extension, isNotNull);
        expect(extension!.triggered, equals(AppColors.triggeredLight));
        expect(extension.acknowledged, equals(AppColors.acknowledgedLight));
        expect(extension.resolved, equals(AppColors.resolvedLight));
      },
    );
  });
}
