/// SQLite schema definitions and column names for the incidents table.
class IncidentTable {
  IncidentTable._();

  static const String tableName = 'incidents';

  static const String colId = 'id';
  static const String colTitle = 'title';
  static const String colSummary = 'summary';
  static const String colStatus = 'status';
  static const String colUrgency = 'urgency';
  static const String colServiceId = 'service_id';
  static const String colServiceName = 'service_name';
  static const String colFingerprint = 'fingerprint';
  static const String colAlertCount = 'alert_count';
  static const String colAcknowledgedAt = 'acknowledged_at';
  static const String colResolvedAt = 'resolved_at';
  static const String colPayload = 'payload';
  static const String colCreatedAt = 'created_at';
  static const String colUpdatedAt = 'updated_at';
  static const String colIsLocallyUpdated = 'is_locally_updated';

  static const String createTableSql =
      '''
    CREATE TABLE IF NOT EXISTS $tableName (
      $colId TEXT PRIMARY KEY,
      $colTitle TEXT NOT NULL,
      $colSummary TEXT,
      $colStatus TEXT NOT NULL,
      $colUrgency TEXT NOT NULL,
      $colServiceId TEXT NOT NULL,
      $colServiceName TEXT NOT NULL,
      $colFingerprint TEXT NOT NULL,
      $colAlertCount INTEGER NOT NULL DEFAULT 1,
      $colAcknowledgedAt TEXT,
      $colResolvedAt TEXT,
      $colPayload TEXT,
      $colCreatedAt TEXT NOT NULL,
      $colUpdatedAt TEXT NOT NULL,
      $colIsLocallyUpdated INTEGER NOT NULL DEFAULT 0
    );
  ''';

  static const String createStatusIndexSql =
      '''
    CREATE INDEX IF NOT EXISTS idx_incidents_status ON $tableName ($colStatus);
  ''';

  static const String createCreatedAtIndexSql =
      '''
    CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON $tableName ($colCreatedAt DESC);
  ''';
}
