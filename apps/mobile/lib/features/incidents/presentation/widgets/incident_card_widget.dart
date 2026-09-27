import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/primary_button.dart';
import '../../../../core/widgets/status_badge_widget.dart';
import '../../domain/incident_model.dart';

/// Interactive card for an active or resolved incident with 1-tap actions.
class IncidentCardWidget extends StatelessWidget {
  final IncidentModel incident;
  final VoidCallback onAcknowledge;
  final VoidCallback onResolve;

  const IncidentCardWidget({
    super.key,
    required this.incident,
    required this.onAcknowledge,
    required this.onResolve,
  });

  String _formatDuration(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    Color leftBorderColor;
    switch (incident.status) {
      case IncidentStatus.triggered:
        leftBorderColor = colors.triggered;
        break;
      case IncidentStatus.acknowledged:
        leftBorderColor = colors.acknowledged;
        break;
      case IncidentStatus.resolved:
        leftBorderColor = colors.resolved;
        break;
    }

    return Card(
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Left Accent Border (Invariant from ui-context.md)
            Container(
              width: 5,
              decoration: BoxDecoration(
                color: leftBorderColor,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  bottomLeft: Radius.circular(12),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top row: StatusBadge + Relative Time + Offline Pending Badge
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            StatusBadgeWidget(status: incident.status),
                            if (incident.isLocallyUpdated) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: colors.acknowledged.withValues(
                                    alpha: 0.15,
                                  ),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(
                                    color: colors.acknowledged.withValues(
                                      alpha: 0.3,
                                    ),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.cloud_upload_outlined,
                                      size: 11,
                                      color: colors.acknowledged,
                                    ),
                                    const SizedBox(width: 3),
                                    Text(
                                      'Offline Queued',
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                        color: colors.acknowledged,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                        Text(
                          _formatDuration(incident.createdAt),
                          style: AppTypography.bodySmall.copyWith(
                            color: colors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Title
                    Text(incident.title, style: AppTypography.titleMedium),
                    if (incident.summary != null &&
                        incident.summary!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        incident.summary!,
                        style: AppTypography.bodyMedium.copyWith(
                          color: colors.textSecondary,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 10),

                    // Metadata row: Service Name + Urgency Pill
                    Row(
                      children: [
                        Icon(
                          Icons.dns_outlined,
                          size: 14,
                          color: colors.textSecondary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          incident.serviceName,
                          style: AppTypography.bodySmall.copyWith(
                            color: colors.textSecondary,
                          ),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: incident.urgency == 'HIGH'
                                ? colors.urgencyHigh.withValues(alpha: 0.15)
                                : colors.urgencyLow.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            incident.urgency,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: incident.urgency == 'HIGH'
                                  ? colors.urgencyHigh
                                  : colors.urgencyLow,
                            ),
                          ),
                        ),
                      ],
                    ),

                    // Triage Action Buttons (56dp Fat-finger emergency trigger)
                    if (incident.status == IncidentStatus.triggered) ...[
                      const SizedBox(height: 14),
                      PrimaryButton(
                        label: 'Acknowledge Incident',
                        onPressed: onAcknowledge,
                        height: 48,
                        icon: Icons.check_circle_outline,
                      ),
                    ] else if (incident.status ==
                        IncidentStatus.acknowledged) ...[
                      const SizedBox(height: 14),
                      SizedBox(
                        height: 48,
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: onResolve,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: colors.resolved,
                            side: BorderSide(
                              color: colors.resolved.withValues(alpha: 0.5),
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          icon: const Icon(Icons.task_alt_rounded, size: 18),
                          label: const Text(
                            'Mark as Resolved',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
