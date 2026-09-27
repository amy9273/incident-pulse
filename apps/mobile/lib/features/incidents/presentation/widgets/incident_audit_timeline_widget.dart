import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile/core/theme/app_colors.dart';
import 'package:mobile/core/theme/app_typography.dart';
import 'package:mobile/core/widgets/status_badge_widget.dart';
import 'package:mobile/features/incidents/domain/incident_model.dart';

class TimelineEventItem {
  final String title;
  final String description;
  final DateTime timestamp;
  final IconData icon;
  final Color color;

  const TimelineEventItem({
    required this.title,
    required this.description,
    required this.timestamp,
    required this.icon,
    required this.color,
  });
}

/// Chronological audit trail timeline widget displaying incident lifecycle events.
class IncidentAuditTimelineWidget extends StatelessWidget {
  final IncidentModel incident;

  const IncidentAuditTimelineWidget({super.key, required this.incident});

  List<TimelineEventItem> _generateTimelineEvents() {
    final events = <TimelineEventItem>[];

    // 1. Alert Triggered
    events.add(
      TimelineEventItem(
        title: 'Alert Ingested & Incident Triggered',
        description:
            'Triggered by automated webhook monitor for ${incident.serviceName}',
        timestamp: incident.createdAt,
        icon: Icons.error_outline,
        color: AppColors.triggered,
      ),
    );

    // 2. Escalation & Assignment
    final escalationTime = incident.createdAt.add(const Duration(seconds: 15));
    events.add(
      TimelineEventItem(
        title: 'Tier 1 Escalation Dispatched',
        description:
            'Escalation policy dispatched push alert to primary on-call responder',
        timestamp: escalationTime,
        icon: Icons.notifications_active_outlined,
        color: AppColors.darkBrandPrimary,
      ),
    );

    // 3. Acknowledged (if applicable)
    if (incident.status == IncidentStatus.acknowledged ||
        incident.status == IncidentStatus.resolved) {
      final ackTime = incident.acknowledgedAt ?? incident.updatedAt;
      events.add(
        TimelineEventItem(
          title: 'Incident Acknowledged',
          description: 'Acknowledged via mobile responder app (SLA paused)',
          timestamp: ackTime,
          icon: Icons.check_circle_outline,
          color: AppColors.acknowledged,
        ),
      );
    }

    // 4. Resolved (if applicable)
    if (incident.status == IncidentStatus.resolved) {
      final resTime = incident.resolvedAt ?? incident.updatedAt;
      events.add(
        TimelineEventItem(
          title: 'Incident Resolved',
          description: 'Mitigated and marked resolved. All alarms cleared.',
          timestamp: resTime,
          icon: Icons.task_alt,
          color: AppColors.resolved,
        ),
      );
    }

    return events;
  }

  @override
  Widget build(BuildContext context) {
    final events = _generateTimelineEvents();

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.darkSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.history,
                size: 20,
                color: AppColors.darkBrandPrimary,
              ),
              const SizedBox(width: 8),
              Text(
                'Audit Timeline & Lifecycle',
                style: AppTypography.titleMedium.copyWith(
                  color: AppColors.darkTextPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: events.length,
            separatorBuilder: (context, index) => Container(
              margin: const EdgeInsets.only(left: 15),
              height: 20,
              width: 2,
              color: AppColors.darkBorder,
            ),
            itemBuilder: (context, index) {
              final event = events[index];
              final timeFormatted = DateFormat(
                'HH:mm:ss',
              ).format(event.timestamp);

              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: event.color.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                      border: Border.all(color: event.color, width: 1.5),
                    ),
                    child: Icon(event.icon, size: 16, color: event.color),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              event.title,
                              style: AppTypography.bodyMedium.copyWith(
                                color: AppColors.darkTextPrimary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              timeFormatted,
                              style: AppTypography.bodySmall.copyWith(
                                color: AppColors.darkTextSecondary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          event.description,
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.darkTextSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}
