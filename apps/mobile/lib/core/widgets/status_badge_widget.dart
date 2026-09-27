import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/app_typography.dart';

/// Incident status enum mirroring backend IncidentStatus.
enum IncidentStatus {
  triggered,
  acknowledged,
  resolved;

  static IncidentStatus fromString(String val) {
    switch (val.toUpperCase()) {
      case 'ACKNOWLEDGED':
        return IncidentStatus.acknowledged;
      case 'RESOLVED':
        return IncidentStatus.resolved;
      case 'TRIGGERED':
      default:
        return IncidentStatus.triggered;
    }
  }

  String get displayName {
    switch (this) {
      case IncidentStatus.triggered:
        return 'TRIGGERED';
      case IncidentStatus.acknowledged:
        return 'ACKNOWLEDGED';
      case IncidentStatus.resolved:
        return 'RESOLVED';
    }
  }
}

/// Standardized pill badge with pulsing beacon for TRIGGERED status.
class StatusBadgeWidget extends StatefulWidget {
  final IncidentStatus status;

  const StatusBadgeWidget({super.key, required this.status});

  @override
  State<StatusBadgeWidget> createState() => _StatusBadgeWidgetState();
}

class _StatusBadgeWidgetState extends State<StatusBadgeWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _pulseAnimation = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    if (widget.status == IncidentStatus.triggered) {
      _pulseController.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(covariant StatusBadgeWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.status == IncidentStatus.triggered &&
        !_pulseController.isAnimating) {
      _pulseController.repeat(reverse: true);
    } else if (widget.status != IncidentStatus.triggered &&
        _pulseController.isAnimating) {
      _pulseController.stop();
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    Color badgeColor;
    IconData badgeIcon;

    switch (widget.status) {
      case IncidentStatus.triggered:
        badgeColor = colors.triggered;
        badgeIcon = Icons.warning_amber_rounded;
        break;
      case IncidentStatus.acknowledged:
        badgeColor = colors.acknowledged;
        badgeIcon = Icons.schedule_rounded;
        break;
      case IncidentStatus.resolved:
        badgeColor = colors.resolved;
        badgeIcon = Icons.check_circle_outline_rounded;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: badgeColor.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999), // Pill shape
        border: Border.all(color: badgeColor.withValues(alpha: 0.35), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (widget.status == IncidentStatus.triggered) ...[
            AnimatedBuilder(
              animation: _pulseAnimation,
              builder: (context, child) {
                return Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: badgeColor.withValues(alpha: _pulseAnimation.value),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: badgeColor.withValues(alpha: 0.4),
                        blurRadius: 4,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(width: 6),
          ] else ...[
            Icon(badgeIcon, size: 13, color: badgeColor),
            const SizedBox(width: 4),
          ],
          Text(
            widget.status.displayName,
            style: AppTypography.badgeLabel.copyWith(
              color: badgeColor,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
