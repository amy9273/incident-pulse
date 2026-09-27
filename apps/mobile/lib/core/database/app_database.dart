import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:path/path.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'tables/incident_table.dart';
import 'tables/outbox_table.dart';

/// Database manager for IncidentPulse local SQLite caching.
class AppDatabase {
  static const String _dbName = 'incident_pulse.db';
  static const int _dbVersion = 1;

  Database? _db;

  AppDatabase({Database? db}) : _db = db;

  Future<Database> get database async {
    if (_db != null && _db!.isOpen) return _db!;
    _db = await _initDatabase();
    return _db!;
  }

  Future<Database> _initDatabase() async {
    // Configure FFI if running in unit test or desktop environment
    if (!kIsWeb &&
        (Platform.isWindows || Platform.isLinux || Platform.isMacOS)) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    }

    final dbPath = await getDatabasesPath();
    final path = join(dbPath, _dbName);

    return await openDatabase(
      path,
      version: _dbVersion,
      onCreate: (db, version) async {
        await _createTables(db);
      },
    );
  }

  static Future<void> _createTables(DatabaseExecutor db) async {
    await db.execute(IncidentTable.createTableSql);
    await db.execute(IncidentTable.createStatusIndexSql);
    await db.execute(IncidentTable.createCreatedAtIndexSql);

    await db.execute(OutboxTable.createTableSql);
    await db.execute(OutboxTable.createPendingIndexSql);
  }

  Future<void> clearAll() async {
    final db = await database;
    await db.delete(IncidentTable.tableName);
    await db.delete(OutboxTable.tableName);
  }

  Future<void> close() async {
    if (_db != null && _db!.isOpen) {
      await _db!.close();
      _db = null;
    }
  }
}
