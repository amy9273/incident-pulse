import 'dart:convert';
import '../../../core/database/tables/incident_table.dart';
import '../../../core/widgets/status_badge_widget.dart';

/// Strongly typed Incident domain model.
/// Anti-slop rule: Zero untyped dynamic maps.
class IncidentModel {
  final String id;
  final String title;
  final String? summary;
  final IncidentStatus status;
  final String urgency;
  final String serviceId;
  final String serviceName;
  final String fingerprint;
  final int alertCount;
  final DateTime? acknowledgedAt;
  final DateTime? resolvedAt;
  final Map<String, dynamic>? payload;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isLocallyUpdated;

  const IncidentModel({
    required this.id,
    required this.title,
    this.summary,
    required this.status,
    required this.urgency,
    required this.serviceId,
    required this.serviceName,
    required this.fingerprint,
    this.alertCount = 1,
    this.acknowledgedAt,
    this.resolvedAt,
    this.payload,
    required this.createdAt,
    required this.updatedAt,
    this.isLocallyUpdated = false,
  });

  /// Parse from REST API JSON response
  factory IncidentModel.fromJson(Map<String, dynamic> json) {
    String svcName = 'Unknown Service';
    if (json['service'] is Map<String, dynamic>) {
      svcName = (json['service'] as Map<String, dynamic>)['name'] as String? ??
          'Unknown Service';
    } else if (json['serviceName'] != null) {
      svcName = json['serviceName'] as String;
    }

    Map<String, dynamic>? parsedPayload;
    if (json['payload'] != null) {
      if (json['payload'] is Map<String, dynamic>) {
        parsedPayload = json['payload'] as Map<String, dynamic>;
      } else if (json['payload'] is String) {
        try {
          parsedPayload =
              jsonDecode(json['payload'] as String) as Map<String, dynamic>;
        } catch (_) {}
      }
    }

    return IncidentModel(
      id: json['id'] as String,
      title: json['title'] as String,
      summary: json['summary'] as String?,
      status: IncidentStatus.fromString(
        json['status'] as String? ?? 'TRIGGERED',
      ),
      urgency: (json['urgency'] as String?)?.toUpperCase() ?? 'HIGH',
      serviceId: json['serviceId'] as String? ?? '',
      serviceName: svcName,
      fingerprint: json['fingerprint'] as String? ?? '',
      alertCount: json['alertCount'] as int? ?? 1,
      acknowledgedAt: json['acknowledgedAt'] != null
          ? DateTime.tryParse(json['acknowledgedAt'] as String)
          : null,
      resolvedAt: json['resolvedAt'] != null
          ? DateTime.tryParse(json['resolvedAt'] as String)
          : null,
      payload: parsedPayload,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
      isLocallyUpdated: false,
    );
  }

  /// Parse from local SQLite row
  factory IncidentModel.fromSqlite(Map<String, dynamic> row) {
    Map<String, dynamic>? parsedPayload;
    if (row[IncidentTable.colPayload] != null) {
      try {
        parsedPayload = jsonDecode(row[IncidentTable.colPayload] as String)
            as Map<String, dynamic>;
      } catch (_) {}
    }

    return IncidentModel(
      id: row[IncidentTable.colId] as String,
      title: row[IncidentTable.colTitle] as String,
      summary: row[IncidentTable.colSummary] as String?,
      status: IncidentStatus.fromString(row[IncidentTable.colStatus] as String),
      urgency: row[IncidentTable.colUrgency] as String,
      serviceId: row[IncidentTable.colServiceId] as String,
      serviceName: row[IncidentTable.colServiceName] as String,
      fingerprint: row[IncidentTable.colFingerprint] as String,
      alertCount: row[IncidentTable.colAlertCount] as int? ?? 1,
      acknowledgedAt: row[IncidentTable.colAcknowledgedAt] != null
          ? DateTime.tryParse(row[IncidentTable.colAcknowledgedAt] as String)
          : null,
      resolvedAt: row[IncidentTable.colResolvedAt] != null
          ? DateTime.tryParse(row[IncidentTable.colResolvedAt] as String)
          : null,
      payload: parsedPayload,
      createdAt: DateTime.parse(row[IncidentTable.colCreatedAt] as String),
      updatedAt: DateTime.parse(row[IncidentTable.colUpdatedAt] as String),
      isLocallyUpdated:
          (row[IncidentTable.colIsLocallyUpdated] as int? ?? 0) == 1,
    );
  }

  /// Convert to SQLite insert/update map
  Map<String, dynamic> toSqlite() {
    return {
      IncidentTable.colId: id,
      IncidentTable.colTitle: title,
      IncidentTable.colSummary: summary,
      IncidentTable.colStatus: status.name.toUpperCase(),
      IncidentTable.colUrgency: urgency,
      IncidentTable.colServiceId: serviceId,
      IncidentTable.colServiceName: serviceName,
      IncidentTable.colFingerprint: fingerprint,
      IncidentTable.colAlertCount: alertCount,
      IncidentTable.colAcknowledgedAt: acknowledgedAt?.toIso8601String(),
      IncidentTable.colResolvedAt: resolvedAt?.toIso8601String(),
      IncidentTable.colPayload: payload != null ? jsonEncode(payload) : null,
      IncidentTable.colCreatedAt: createdAt.toIso8601String(),
      IncidentTable.colUpdatedAt: updatedAt.toIso8601String(),
      IncidentTable.colIsLocallyUpdated: isLocallyUpdated ? 1 : 0,
    };
  }

  IncidentModel copyWith({
    String? id,
    String? title,
    String? summary,
    IncidentStatus? status,
    String? urgency,
    String? serviceId,
    String? serviceName,
    String? fingerprint,
    int? alertCount,
    DateTime? acknowledgedAt,
    DateTime? resolvedAt,
    Map<String, dynamic>? payload,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isLocallyUpdated,
  }) {
    return IncidentModel(
      id: id ?? this.id,
      title: title ?? this.title,
      summary: summary ?? this.summary,
      status: status ?? this.status,
      urgency: urgency ?? this.urgency,
      serviceId: serviceId ?? this.serviceId,
      serviceName: serviceName ?? this.serviceName,
      fingerprint: fingerprint ?? this.fingerprint,
      alertCount: alertCount ?? this.alertCount,
      acknowledgedAt: acknowledgedAt ?? this.acknowledgedAt,
      resolvedAt: resolvedAt ?? this.resolvedAt,
      payload: payload ?? this.payload,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isLocallyUpdated: isLocallyUpdated ?? this.isLocallyUpdated,
    );
  }
}
