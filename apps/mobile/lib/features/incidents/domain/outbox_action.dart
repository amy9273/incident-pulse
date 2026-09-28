import 'dart:convert';
import '../../../core/database/tables/outbox_table.dart';

enum OutboxActionType {
  acknowledge,
  resolve;

  static OutboxActionType fromString(String val) {
    switch (val.toUpperCase()) {
      case 'RESOLVE':
        return OutboxActionType.resolve;
      case 'ACKNOWLEDGE':
      default:
        return OutboxActionType.acknowledge;
    }
  }

  String toDbString() => name.toUpperCase();
}

enum OutboxStatus {
  pending,
  syncing,
  failed;

  static OutboxStatus fromString(String val) {
    switch (val.toUpperCase()) {
      case 'SYNCING':
        return OutboxStatus.syncing;
      case 'FAILED':
        return OutboxStatus.failed;
      case 'PENDING':
      default:
        return OutboxStatus.pending;
    }
  }

  String toDbString() => name.toUpperCase();
}

/// OutboxAction representing an offline transaction task.
/// Invariants #5 & #7.
class OutboxAction {
  final String id;
  final String incidentId;
  final OutboxActionType action;
  final Map<String, dynamic>? payload;
  final DateTime createdAt;
  final OutboxStatus status;
  final int retryCount;
  final String? lastError;

  const OutboxAction({
    required this.id,
    required this.incidentId,
    required this.action,
    this.payload,
    required this.createdAt,
    this.status = OutboxStatus.pending,
    this.retryCount = 0,
    this.lastError,
  });

  factory OutboxAction.fromSqlite(Map<String, dynamic> row) {
    Map<String, dynamic>? parsedPayload;
    if (row[OutboxTable.colPayload] != null) {
      try {
        parsedPayload = jsonDecode(row[OutboxTable.colPayload] as String)
            as Map<String, dynamic>;
      } catch (_) {}
    }

    return OutboxAction(
      id: row[OutboxTable.colId] as String,
      incidentId: row[OutboxTable.colIncidentId] as String,
      action: OutboxActionType.fromString(row[OutboxTable.colAction] as String),
      payload: parsedPayload,
      createdAt: DateTime.parse(row[OutboxTable.colCreatedAt] as String),
      status: OutboxStatus.fromString(row[OutboxTable.colStatus] as String),
      retryCount: row[OutboxTable.colRetryCount] as int? ?? 0,
      lastError: row[OutboxTable.colLastError] as String?,
    );
  }

  Map<String, dynamic> toSqlite() {
    return {
      OutboxTable.colId: id,
      OutboxTable.colIncidentId: incidentId,
      OutboxTable.colAction: action.toDbString(),
      OutboxTable.colPayload: payload != null ? jsonEncode(payload) : null,
      OutboxTable.colCreatedAt: createdAt.toIso8601String(),
      OutboxTable.colStatus: status.toDbString(),
      OutboxTable.colRetryCount: retryCount,
      OutboxTable.colLastError: lastError,
    };
  }

  OutboxAction copyWith({
    String? id,
    String? incidentId,
    OutboxActionType? action,
    Map<String, dynamic>? payload,
    DateTime? createdAt,
    OutboxStatus? status,
    int? retryCount,
    String? lastError,
  }) {
    return OutboxAction(
      id: id ?? this.id,
      incidentId: incidentId ?? this.incidentId,
      action: action ?? this.action,
      payload: payload ?? this.payload,
      createdAt: createdAt ?? this.createdAt,
      status: status ?? this.status,
      retryCount: retryCount ?? this.retryCount,
      lastError: lastError ?? this.lastError,
    );
  }
}
