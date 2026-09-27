import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/notifications/notification_provider.dart';
import 'package:mobile/core/notifications/push_notification_service.dart';
import 'package:mobile/core/theme/app_colors.dart';
import 'package:mobile/core/theme/app_typography.dart';
import 'package:mobile/core/widgets/primary_button.dart';
import 'package:mobile/features/incidents/presentation/controllers/incidents_controller.dart';

/// High-contrast heads-up emergency alert banner.
/// Slides into view at the top of the screen when a critical alert arrives,
/// providing instant 1-tap Acknowledge directly from the notification.
class EmergencyAlertBanner extends ConsumerWidget {
  final PushAlertEvent event;
  final VoidCallback onOpen;
  final VoidCallback onDismiss;

  const EmergencyAlertBanner({
    super.key,
    required this.event,
    required this.onOpen,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final haptic = ref.read(hapticServiceProvider);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1F1215), // Deep dark crimson obsidian
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.triggered.withValues(alpha: 0.8),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.triggered.withValues(alpha: 0.25),
            blurRadius: 16,
            spreadRadius: 2,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  color: AppColors.triggered,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.triggered.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'CRITICAL ALERT • 1-TAP TRIAGE',
                  style: AppTypography.badgeLabel.copyWith(
                    color: AppColors.triggered,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.close, size: 20),
                color: AppColors.darkTextSecondary,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: onDismiss,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            event.title,
            style: AppTypography.headlineMedium.copyWith(
              color: AppColors.darkTextPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(
                Icons.dns_outlined,
                size: 14,
                color: AppColors.darkTextSecondary,
              ),
              const SizedBox(width: 4),
              Text(
                event.serviceName,
                style: AppTypography.bodySmall.copyWith(
                  color: AppColors.darkTextSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                flex: 3,
                child: PrimaryButton(
                  label: 'Acknowledge Now',
                  icon: Icons.check_circle_outline,
                  backgroundColor: AppColors.acknowledged,
                  textColor: Colors.black,
                  onPressed: () async {
                    await haptic.acknowledgeImpact();
                    await ref
                        .read(incidentsControllerProvider.notifier)
                        .acknowledgeIncident(event.incidentId);
                    onDismiss();
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 56),
                    side: BorderSide(
                      color: AppColors.darkTextSecondary.withValues(alpha: 0.3),
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: onOpen,
                  child: Text(
                    'View Details',
                    style: AppTypography.labelLarge.copyWith(
                      color: AppColors.darkTextPrimary,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
