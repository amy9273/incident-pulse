/// SQLite schema definitions and column names for the transactional outbox table.
/// Engineering Best Practices §13, Architectural Invariants #5 & #7.
class OutboxTable {
  OutboxTable._();

  static const String tableName = 'outbox';

  static const String colId = 'id';
  static const String colIncidentId = 'incident_id';
  static const String colAction = 'action';
  static const String colPayload = 'payload';
  static const String colCreatedAt = 'created_at';
  static const String colStatus = 'status';
  static const String colRetryCount = 'retry_count';
  static const String colLastError = 'last_error';

  static const String createTableSql =
      '''
    CREATE TABLE IF NOT EXISTS $tableName (
      $colId TEXT PRIMARY KEY,
      $colIncidentId TEXT NOT NULL,
      $colAction TEXT NOT NULL,
      $colPayload TEXT,
      $colCreatedAt TEXT NOT NULL,
      $colStatus TEXT NOT NULL DEFAULT 'PENDING',
      $colRetryCount INTEGER NOT NULL DEFAULT 0,
      $colLastError TEXT
    );
  ''';

  static const String createPendingIndexSql =
      '''
    CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON $tableName ($colStatus, $colCreatedAt ASC);
  ''';
}
