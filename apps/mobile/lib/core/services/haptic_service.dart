import 'package:flutter/services.dart';

/// Service providing ergonomic haptic feedback patterns for incident triage.
/// Meets mobile ergonomics in context/ui-context.md:
/// - Acknowledge: Medium haptic impact.
/// - Resolve: Light double/selection haptic confirmation.
/// - Critical Alert: Heavy notification haptic pattern.
class HapticService {
  const HapticService();

  /// Tapping Acknowledge: Medium haptic impact.
  Future<void> acknowledgeImpact() async {
    try {
      await HapticFeedback.mediumImpact();
    } catch (_) {
      // Platform channels may be absent during headless unit testing.
    }
  }

  /// Tapping Resolve: Light haptic confirmation.
  Future<void> resolveImpact() async {
    try {
      await HapticFeedback.lightImpact();
      await Future<void>.delayed(const Duration(milliseconds: 100));
      await HapticFeedback.selectionClick();
    } catch (_) {
      // Fallback silently if platform not supported
    }
  }

  /// Incoming critical alert: Heavy notification haptic pattern.
  Future<void> criticalAlertImpact() async {
    try {
      await HapticFeedback.heavyImpact();
      await Future<void>.delayed(const Duration(milliseconds: 150));
      await HapticFeedback.heavyImpact();
    } catch (_) {
      // Fallback silently
    }
  }

  /// General button tap / selection click.
  Future<void> selectionClick() async {
    try {
      await HapticFeedback.selectionClick();
    } catch (_) {
      // Fallback silently
    }
  }
}
