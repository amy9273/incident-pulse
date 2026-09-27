import 'package:flutter/material.dart';

/// Semantic colors for IncidentPulse matching context/ui-context.md.
/// Strict anti-slop rule: Never use ad-hoc hex values in widgets.
class AppColors {
  AppColors._();

  // Status Colors (Sacred Semantics)
  static const Color triggered = Color(0xFFEF4444);
  static const Color triggeredLight = Color(0xFFDC2626);
  static const Color triggeredGlow = Color(0x40EF4444);

  static const Color acknowledged = Color(0xFFF59E0B);
  static const Color acknowledgedLight = Color(0xFFD97706);
  static const Color acknowledgedGlow = Color(0x40F59E0B);

  static const Color resolved = Color(0xFF10B981);
  static const Color resolvedLight = Color(0xFF059669);
  static const Color resolvedGlow = Color(0x4010B981);

  // Urgency
  static const Color urgencyHigh = Color(0xFFF87171);
  static const Color urgencyHighBg = Color(0xFF991B1B);
  static const Color urgencyLow = Color(0xFF94A3B8);
  static const Color urgencyLowBg = Color(0xFF475569);

  // Dark Palette (Deep Obsidian Theme)
  static const Color darkBackground = Color(0xFF0B0F19);
  static const Color darkSurface = Color(0xFF111827);
  static const Color darkSurfaceSecondary = Color(0xFF1F2937);
  static const Color darkBorder = Color(0xFF374151);
  static const Color darkTextPrimary = Color(0xFFF9FAFB);
  static const Color darkTextSecondary = Color(0xFF9CA3AF);
  static const Color darkBrandPrimary = Color(0xFF3B82F6);

  // Light Palette (Slate-50 Theme)
  static const Color lightBackground = Color(0xFFF8FAFC);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceSecondary = Color(0xFFF1F5F9);
  static const Color lightBorder = Color(0xFFE2E8F0);
  static const Color lightTextPrimary = Color(0xFF0F172A);
  static const Color lightTextSecondary = Color(0xFF64748B);
  static const Color lightBrandPrimary = Color(0xFF2563EB);
}

/// ThemeExtension to access semantic colors from BuildContext
class AppThemeColors extends ThemeExtension<AppThemeColors> {
  final Color triggered;
  final Color acknowledged;
  final Color resolved;
  final Color urgencyHigh;
  final Color urgencyLow;
  final Color surfaceSecondary;
  final Color border;
  final Color textSecondary;

  const AppThemeColors({
    required this.triggered,
    required this.acknowledged,
    required this.resolved,
    required this.urgencyHigh,
    required this.urgencyLow,
    required this.surfaceSecondary,
    required this.border,
    required this.textSecondary,
  });

  static const dark = AppThemeColors(
    triggered: AppColors.triggered,
    acknowledged: AppColors.acknowledged,
    resolved: AppColors.resolved,
    urgencyHigh: AppColors.urgencyHigh,
    urgencyLow: AppColors.urgencyLow,
    surfaceSecondary: AppColors.darkSurfaceSecondary,
    border: AppColors.darkBorder,
    textSecondary: AppColors.darkTextSecondary,
  );

  static const light = AppThemeColors(
    triggered: AppColors.triggeredLight,
    acknowledged: AppColors.acknowledgedLight,
    resolved: AppColors.resolvedLight,
    urgencyHigh: AppColors.urgencyHighBg,
    urgencyLow: AppColors.urgencyLowBg,
    surfaceSecondary: AppColors.lightSurfaceSecondary,
    border: AppColors.lightBorder,
    textSecondary: AppColors.lightTextSecondary,
  );

  @override
  ThemeExtension<AppThemeColors> copyWith({
    Color? triggered,
    Color? acknowledged,
    Color? resolved,
    Color? urgencyHigh,
    Color? urgencyLow,
    Color? surfaceSecondary,
    Color? border,
    Color? textSecondary,
  }) {
    return AppThemeColors(
      triggered: triggered ?? this.triggered,
      acknowledged: acknowledged ?? this.acknowledged,
      resolved: resolved ?? this.resolved,
      urgencyHigh: urgencyHigh ?? this.urgencyHigh,
      urgencyLow: urgencyLow ?? this.urgencyLow,
      surfaceSecondary: surfaceSecondary ?? this.surfaceSecondary,
      border: border ?? this.border,
      textSecondary: textSecondary ?? this.textSecondary,
    );
  }

  @override
  ThemeExtension<AppThemeColors> lerp(
    covariant ThemeExtension<AppThemeColors>? other,
    double t,
  ) {
    if (other is! AppThemeColors) return this;
    return AppThemeColors(
      triggered: Color.lerp(triggered, other.triggered, t)!,
      acknowledged: Color.lerp(acknowledged, other.acknowledged, t)!,
      resolved: Color.lerp(resolved, other.resolved, t)!,
      urgencyHigh: Color.lerp(urgencyHigh, other.urgencyHigh, t)!,
      urgencyLow: Color.lerp(urgencyLow, other.urgencyLow, t)!,
      surfaceSecondary: Color.lerp(
        surfaceSecondary,
        other.surfaceSecondary,
        t,
      )!,
      border: Color.lerp(border, other.border, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
    );
  }
}
