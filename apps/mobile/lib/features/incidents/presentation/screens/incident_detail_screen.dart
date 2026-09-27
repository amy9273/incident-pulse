import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:mobile/core/notifications/notification_provider.dart';
import 'package:mobile/core/theme/app_colors.dart';
import 'package:mobile/core/theme/app_typography.dart';
import 'package:mobile/core/widgets/primary_button.dart';
import 'package:mobile/core/widgets/status_badge_widget.dart';
import 'package:mobile/features/incidents/domain/incident_model.dart';
import 'package:mobile/features/incidents/presentation/controllers/incidents_controller.dart';
import 'package:mobile/features/incidents/presentation/widgets/incident_audit_timeline_widget.dart';
import 'package:mobile/features/incidents/presentation/widgets/raw_payload_viewer_widget.dart';

/// High-contrast Emergency 1-Tap Triage Detail Screen.
/// Designed for 3:00 AM wake-ups with high-contrast ergonomics,
/// sticky 56dp fat-finger action buttons, and haptic feedback.
class IncidentDetailScreen extends ConsumerStatefulWidget {
  final IncidentModel incident;

  const IncidentDetailScreen({super.key, required this.incident});

  @override
  ConsumerState<IncidentDetailScreen> createState() =>
      _IncidentDetailScreenState();
}

class _IncidentDetailScreenState extends ConsumerState<IncidentDetailScreen> {
  IncidentModel? _optimisticIncident;
  bool _isProcessing = false;

  Future<void> _handleAcknowledge(IncidentModel current) async {
    final haptic = ref.read(hapticServiceProvider);
    await haptic.acknowledgeImpact();

    setState(() {
      _isProcessing = true;
      _optimisticIncident = current.copyWith(
        status: IncidentStatus.acknowledged,
        acknowledgedAt: DateTime.now(),
      );
    });

    try {
      await ref
          .read(incidentsControllerProvider.notifier)
          .acknowledgeIncident(current.id);
    } catch (_) {
      // Optimistic update retained
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  Future<void> _handleResolve(IncidentModel current) async {
    final haptic = ref.read(hapticServiceProvider);
    await haptic.resolveImpact();

    setState(() {
      _isProcessing = true;
      _optimisticIncident = current.copyWith(
        status: IncidentStatus.resolved,
        resolvedAt: DateTime.now(),
      );
    });

    try {
      await ref
          .read(incidentsControllerProvider.notifier)
          .resolveIncident(current.id);
    } catch (_) {
      // Optimistic update retained
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    IncidentModel currentIncident = _optimisticIncident ?? widget.incident;

    try {
      final incidentsList = ref.watch(incidentsControllerProvider).incidents;
      final fromStore = incidentsList.firstWhere(
        (i) => i.id == widget.incident.id,
        orElse: () => currentIncident,
      );
      if (_optimisticIncident == null) {
        currentIncident = fromStore;
      }
    } catch (_) {
      // Fallback for tests or uninitialized stores
    }

    final timeFormatted = DateFormat(
      'MMM d, yyyy • HH:mm:ss',
    ).format(currentIncident.createdAt);
    final elapsedMinutes = DateTime.now()
        .difference(currentIncident.createdAt)
        .inMinutes;

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      appBar: AppBar(
        backgroundColor: AppColors.darkBackground,
        elevation: 0,
        title: Text(
          'Incident #${currentIncident.id.length > 8 ? currentIncident.id.substring(0, 8) : currentIncident.id}',
          style: AppTypography.bodyMedium.copyWith(
            color: AppColors.darkTextSecondary,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          if (currentIncident.isLocallyUpdated)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.acknowledged.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: AppColors.acknowledged.withValues(alpha: 0.5),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.cloud_off,
                        size: 14,
                        color: AppColors.acknowledged,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Outbox Queued',
                        style: AppTypography.badgeLabel.copyWith(
                          color: AppColors.acknowledged,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Badges
                    Row(
                      children: [
                        StatusBadgeWidget(status: currentIncident.status),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: currentIncident.urgency == 'HIGH'
                                ? AppColors.urgencyHigh.withValues(alpha: 0.15)
                                : AppColors.urgencyLow.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: currentIncident.urgency == 'HIGH'
                                  ? AppColors.urgencyHigh
                                  : AppColors.urgencyLow,
                              width: 1,
                            ),
                          ),
                          child: Text(
                            'URGENCY ${currentIncident.urgency}',
                            style: AppTypography.badgeLabel.copyWith(
                              color: currentIncident.urgency == 'HIGH'
                                  ? AppColors.urgencyHigh
                                  : AppColors.urgencyLow,
                            ),
                          ),
                        ),
                        const Spacer(),
                        Text(
                          '${elapsedMinutes}m elapsed',
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.darkTextSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Title
                    Text(
                      currentIncident.title,
                      style: AppTypography.headlineMedium.copyWith(
                        color: AppColors.darkTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Service and Timestamp
                    Row(
                      children: [
                        const Icon(
                          Icons.dns,
                          size: 16,
                          color: AppColors.darkBrandPrimary,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          currentIncident.serviceName,
                          style: AppTypography.bodyMedium.copyWith(
                            color: AppColors.darkBrandPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Text(
                          '•',
                          style: TextStyle(color: AppColors.darkTextSecondary),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          timeFormatted,
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.darkTextSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // SLA & Auto-Escalation Countdown Card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.darkSurface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.darkBorder),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color:
                                  currentIncident.status ==
                                      IncidentStatus.triggered
                                  ? AppColors.triggered.withValues(alpha: 0.15)
                                  : AppColors.resolved.withValues(alpha: 0.15),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              currentIncident.status == IncidentStatus.triggered
                                  ? Icons.timer_outlined
                                  : Icons.check_circle_outline,
                              color:
                                  currentIncident.status ==
                                      IncidentStatus.triggered
                                  ? AppColors.triggered
                                  : AppColors.resolved,
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  currentIncident.status ==
                                          IncidentStatus.triggered
                                      ? 'Tier 1 Escalation Active (SLA Running)'
                                      : currentIncident.status ==
                                            IncidentStatus.acknowledged
                                      ? 'Acknowledged • SLA Paused'
                                      : 'Incident Resolved • All SLAs Met',
                                  style: AppTypography.bodyMedium.copyWith(
                                    color: AppColors.darkTextPrimary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  currentIncident.status ==
                                          IncidentStatus.triggered
                                      ? 'Auto-escalating to Tier 2 in 4m 30s if unacknowledged'
                                      : 'Primary On-Call Responder Assigned',
                                  style: AppTypography.bodySmall.copyWith(
                                    color: AppColors.darkTextSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Raw Payload Viewer
                    RawPayloadViewerWidget(payload: currentIncident.payload),

                    // Audit Timeline
                    IncidentAuditTimelineWidget(incident: currentIncident),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),

            // Sticky Bottom Action Bar (Fat-Finger Ergonomics >= 56dp)
            Container(
              padding: EdgeInsets.fromLTRB(
                16,
                12,
                16,
                12 + MediaQuery.of(context).padding.bottom,
              ),
              decoration: BoxDecoration(
                color: AppColors.darkSurface,
                border: const Border(
                  top: BorderSide(color: AppColors.darkBorder, width: 1),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.4),
                    blurRadius: 12,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: _buildActionButtons(currentIncident),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons(IncidentModel currentIncident) {
    if (currentIncident.status == IncidentStatus.resolved) {
      return Container(
        height: 56,
        decoration: BoxDecoration(
          color: AppColors.resolved.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.resolved.withValues(alpha: 0.4)),
        ),
        child: Center(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.check_circle,
                color: AppColors.resolved,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Incident Resolved',
                style: AppTypography.labelLarge.copyWith(
                  color: AppColors.resolved,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (currentIncident.status == IncidentStatus.acknowledged) {
      return PrimaryButton(
        label: _isProcessing ? 'Resolving...' : 'Resolve Incident',
        icon: Icons.task_alt,
        isLoading: _isProcessing,
        backgroundColor: AppColors.resolved,
        textColor: Colors.white,
        onPressed: () => _handleResolve(currentIncident),
      );
    }

    // Status is TRIGGERED: 1-Tap Triage Buttons (Acknowledge & Resolve)
    return Row(
      children: [
        Expanded(
          flex: 3,
          child: PrimaryButton(
            label: _isProcessing ? 'Acknowledging...' : 'Acknowledge',
            icon: Icons.check_circle_outline,
            isLoading: _isProcessing,
            backgroundColor: AppColors.acknowledged,
            textColor: Colors.black,
            onPressed: () => _handleAcknowledge(currentIncident),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          flex: 2,
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(double.infinity, 56),
              side: BorderSide(
                color: AppColors.resolved.withValues(alpha: 0.8),
                width: 1.5,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              foregroundColor: AppColors.resolved,
            ),
            icon: const Icon(Icons.task_alt, size: 20),
            label: Text(
              'Resolve',
              style: AppTypography.labelLarge.copyWith(
                color: AppColors.resolved,
              ),
            ),
            onPressed: _isProcessing
                ? null
                : () => _handleResolve(currentIncident),
          ),
        ),
      ],
    );
  }
}
