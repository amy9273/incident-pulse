import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/app_typography.dart';
import 'primary_button.dart';

/// Meaningful empty state view adhering to the 4-state UI rule.
class EmptyStateWidget extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final String? actionLabel;
  final VoidCallback? onAction;

  const EmptyStateWidget({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 48),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: colors.surfaceSecondary,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 48, color: colors.textSecondary),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: AppTypography.headlineMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              description,
              style: AppTypography.bodyMedium.copyWith(
                color: colors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 24),
              PrimaryButton(
                label: actionLabel!,
                onPressed: onAction!,
                icon: Icons.refresh,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
