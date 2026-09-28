import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:uuid/uuid.dart';
import '../../../core/database/app_database.dart';
import '../../../core/database/tables/incident_table.dart';
import '../../../core/database/tables/outbox_table.dart';
import '../../../core/widgets/status_badge_widget.dart';
import '../domain/incident_model.dart';
import '../domain/outbox_action.dart';

/// Local data source handling SQLite queries and atomic transactional outbox operations.
class IncidentLocalDataSource {
  final AppDatabase _appDatabase;
  final Uuid _uuid;

  IncidentLocalDataSource(this._appDatabase, [Uuid? uuid])
      : _uuid = uuid ?? const Uuid();

  Future<Database> get _db => _appDatabase.database;

  /// Retrieve all cached incidents ordered by creation date
  Future<List<IncidentModel>> getAllIncidents() async {
    final db = await _db;
    final rows = await db.query(
      IncidentTable.tableName,
      orderBy: '${IncidentTable.colCreatedAt} DESC',
    );
    return rows.map(IncidentModel.fromSqlite).toList();
  }

  /// Get single cached incident
  Future<IncidentModel?> getIncidentById(String id) async {
    final db = await _db;
    final rows = await db.query(
      IncidentTable.tableName,
      where: '${IncidentTable.colId} = ?',
      whereArgs: [id],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return IncidentModel.fromSqlite(rows.first);
  }

  /// Bulk upsert remote incidents while preserving local optimistic edits
  Future<void> upsertRemoteIncidents(List<IncidentModel> incidents) async {
    final db = await _db;
    await db.transaction((txn) async {
      for (final incident in incidents) {
        final existing = await txn.query(
          IncidentTable.tableName,
          columns: [IncidentTable.colId, IncidentTable.colIsLocallyUpdated],
          where: '${IncidentTable.colId} = ?',
          whereArgs: [incident.id],
          limit: 1,
        );

        if (existing.isNotEmpty) {
          final isLocallyUpdated =
              (existing.first[IncidentTable.colIsLocallyUpdated] as int? ??
                      0) ==
                  1;
          if (isLocallyUpdated) {
            // Skip overwriting local optimistic changes awaiting sync
            continue;
          }
        }

        await txn.insert(
          IncidentTable.tableName,
          incident.toSqlite(),
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
    });
  }

  /// Transactional Acknowledge (Invariant #3 & Invariant #5)
  /// Updates local incident record and inserts outbox task atomically.
  Future<void> transactionalAcknowledge(String incidentId) async {
    final db = await _db;
    final now = DateTime.now();
    final outboxId = _uuid.v4();

    await db.transaction((txn) async {
      // 1. Update incident state locally (< 16ms)
      await txn.update(
        IncidentTable.tableName,
        {
          IncidentTable.colStatus:
              IncidentStatus.acknowledged.name.toUpperCase(),
          IncidentTable.colAcknowledgedAt: now.toIso8601String(),
          IncidentTable.colUpdatedAt: now.toIso8601String(),
          IncidentTable.colIsLocallyUpdated: 1,
        },
        where: '${IncidentTable.colId} = ?',
        whereArgs: [incidentId],
      );

      // 2. Insert outbox task in the same atomic transaction
      await txn.insert(OutboxTable.tableName, {
        OutboxTable.colId: outboxId,
        OutboxTable.colIncidentId: incidentId,
        OutboxTable.colAction: OutboxActionType.acknowledge.toDbString(),
        OutboxTable.colPayload: null,
        OutboxTable.colCreatedAt: now.toIso8601String(),
        OutboxTable.colStatus: OutboxStatus.pending.toDbString(),
        OutboxTable.colRetryCount: 0,
        OutboxTable.colLastError: null,
      });
    });
  }

  /// Transactional Resolve (Invariant #3 & Invariant #5)
  /// Updates local incident record and inserts outbox task atomically.
  Future<void> transactionalResolve(
    String incidentId, {
    String? resolutionNote,
  }) async {
    final db = await _db;
    final now = DateTime.now();
    final outboxId = _uuid.v4();

    await db.transaction((txn) async {
      // 1. Update incident state locally (< 16ms)
      await txn.update(
        IncidentTable.tableName,
        {
          IncidentTable.colStatus: IncidentStatus.resolved.name.toUpperCase(),
          IncidentTable.colResolvedAt: now.toIso8601String(),
          IncidentTable.colUpdatedAt: now.toIso8601String(),
          IncidentTable.colIsLocallyUpdated: 1,
        },
        where: '${IncidentTable.colId} = ?',
        whereArgs: [incidentId],
      );

      // 2. Insert outbox task in the same atomic transaction
      final payloadMap = resolutionNote != null && resolutionNote.isNotEmpty
          ? {'resolutionNote': resolutionNote}
          : null;

      await txn.insert(OutboxTable.tableName, {
        OutboxTable.colId: outboxId,
        OutboxTable.colIncidentId: incidentId,
        OutboxTable.colAction: OutboxActionType.resolve.toDbString(),
        OutboxTable.colPayload:
            payloadMap != null ? jsonEncode(payloadMap) : null,
        OutboxTable.colCreatedAt: now.toIso8601String(),
        OutboxTable.colStatus: OutboxStatus.pending.toDbString(),
        OutboxTable.colRetryCount: 0,
        OutboxTable.colLastError: null,
      });
    });
  }

  /// Retrieve all pending outbox actions ready to sync
  Future<List<OutboxAction>> getPendingOutboxActions() async {
    final db = await _db;
    final rows = await db.query(
      OutboxTable.tableName,
      where: '${OutboxTable.colStatus} != ?',
      whereArgs: [OutboxStatus.syncing.toDbString()],
      orderBy: '${OutboxTable.colCreatedAt} ASC',
    );
    return rows.map(OutboxAction.fromSqlite).toList();
  }

  /// Count pending outbox actions
  Future<int> getPendingOutboxCount() async {
    final db = await _db;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM ${OutboxTable.tableName}',
    );
    if (result.isEmpty) return 0;
    return Sqflite.firstIntValue(result) ?? 0;
  }

  /// Update outbox item status and retry metadata
  Future<void> updateOutboxAction(OutboxAction action) async {
    final db = await _db;
    await db.update(
      OutboxTable.tableName,
      action.toSqlite(),
      where: '${OutboxTable.colId} = ?',
      whereArgs: [action.id],
    );
  }

  /// Delete outbox item upon confirmed server dispatch
  Future<void> deleteOutboxAction(String outboxId) async {
    final db = await _db;
    await db.delete(
      OutboxTable.tableName,
      where: '${OutboxTable.colId} = ?',
      whereArgs: [outboxId],
    );
  }

  /// Mark incident as clean (local modifications synced with server)
  Future<void> markIncidentSynced(String incidentId) async {
    final db = await _db;
    await db.update(
      IncidentTable.tableName,
      {IncidentTable.colIsLocallyUpdated: 0},
      where: '${IncidentTable.colId} = ?',
      whereArgs: [incidentId],
    );
  }
}
