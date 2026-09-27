import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/theme/app_colors.dart';
import 'package:mobile/core/theme/app_typography.dart';

/// Collapsible high-contrast raw alert JSON payload viewer with copy action.
class RawPayloadViewerWidget extends StatefulWidget {
  final Map<String, dynamic>? payload;

  const RawPayloadViewerWidget({super.key, required this.payload});

  @override
  State<RawPayloadViewerWidget> createState() => _RawPayloadViewerWidgetState();
}

class _RawPayloadViewerWidgetState extends State<RawPayloadViewerWidget> {
  bool _isExpanded = false;
  bool _copied = false;

  String _buildAttributeSummary() {
    if (widget.payload == null || widget.payload!.isEmpty) return '';
    final keys = widget.payload!.keys.take(3).toList();
    final parts = keys
        .map((k) {
          final val = widget.payload![k];
          return '$k: $val';
        })
        .join(' • ');
    return parts;
  }

  @override
  Widget build(BuildContext context) {
    if (widget.payload == null || widget.payload!.isEmpty) {
      return const SizedBox.shrink();
    }

    final formattedJson = const JsonEncoder.withIndent(
      '  ',
    ).convert(widget.payload);

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.darkSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.darkBorder, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () {
              setState(() {
                _isExpanded = !_isExpanded;
              });
            },
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(
                    Icons.code,
                    size: 20,
                    color: AppColors.darkBrandPrimary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Raw Alert Payload',
                    style: AppTypography.bodyMedium.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.darkTextPrimary,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.darkSurfaceSecondary,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${widget.payload!.length} keys',
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.darkTextSecondary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    _isExpanded ? Icons.expand_less : Icons.expand_more,
                    color: AppColors.darkTextSecondary,
                  ),
                ],
              ),
            ),
          ),
          if (!_isExpanded) ...[
            Padding(
              padding: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFF070B12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: AppColors.darkBorder.withValues(alpha: 0.5),
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _buildAttributeSummary(),
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 11,
                          color: Color(0xFF93C5FD),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Expand [▼]',
                      style: AppTypography.badgeLabel.copyWith(
                        color: AppColors.darkBrandPrimary,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
          if (_isExpanded) ...[
            const Divider(height: 1, color: AppColors.darkBorder),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'JSON FORMAT',
                        style: AppTypography.badgeLabel.copyWith(
                          color: AppColors.darkTextSecondary,
                        ),
                      ),
                      TextButton.icon(
                        icon: Icon(
                          _copied ? Icons.check : Icons.copy,
                          size: 16,
                          color: _copied
                              ? AppColors.resolved
                              : AppColors.darkBrandPrimary,
                        ),
                        label: Text(
                          _copied ? 'Copied' : 'Copy JSON',
                          style: AppTypography.bodySmall.copyWith(
                            color: _copied
                                ? AppColors.resolved
                                : AppColors.darkBrandPrimary,
                          ),
                        ),
                        onPressed: () async {
                          await Clipboard.setData(
                            ClipboardData(text: formattedJson),
                          );
                          setState(() {
                            _copied = true;
                          });
                          await Future.delayed(const Duration(seconds: 2));
                          if (mounted) {
                            setState(() {
                              _copied = false;
                            });
                          }
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B12),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: AppColors.darkBorder.withValues(alpha: 0.5),
                      ),
                    ),
                    child: SelectableText(
                      formattedJson,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: Color(0xFF93C5FD),
                        height: 1.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
