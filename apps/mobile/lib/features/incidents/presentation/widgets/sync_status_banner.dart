import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/theme/app_typography.dart';

/// Status banner indicating pending transactional outbox sync tasks.
class SyncStatusBanner extends StatelessWidget {
  final int pendingCount;
  final VoidCallback onSyncNow;

  const SyncStatusBanner({
    super.key,
    required this.pendingCount,
    required this.onSyncNow,
  });

  @override
  Widget build(BuildContext context) {
    if (pendingCount <= 0) return const SizedBox.shrink();

    final colors = context.colors;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: colors.acknowledged.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: colors.acknowledged.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          Icon(
            Icons.cloud_upload_outlined,
            size: 20,
            color: colors.acknowledged,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              '$pendingCount offline ${pendingCount == 1 ? "action" : "actions"} pending server sync',
              style: AppTypography.bodySmall.copyWith(
                color: colors.acknowledged,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          TextButton(
            onPressed: onSyncNow,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(
              'Sync Now',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: colors.acknowledged,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
