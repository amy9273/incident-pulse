import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Shimmering skeleton loader for the mandatory 4-state UI loading phase.
class SkeletonWidget extends StatefulWidget {
  final double width;
  final double height;
  final double borderRadius;

  const SkeletonWidget({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = 8,
  });

  const SkeletonWidget.rectangular({
    super.key,
    this.width = double.infinity,
    required this.height,
    this.borderRadius = 8,
  });

  const SkeletonWidget.circular({super.key, required double size})
    : width = size,
      height = size,
      borderRadius = size / 2;

  @override
  State<SkeletonWidget> createState() => _SkeletonWidgetState();
}

class _SkeletonWidgetState extends State<SkeletonWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    _animation = Tween<double>(
      begin: 0.35,
      end: 0.85,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: colors.surfaceSecondary.withValues(alpha: _animation.value),
            borderRadius: BorderRadius.circular(widget.borderRadius),
          ),
        );
      },
    );
  }
}
