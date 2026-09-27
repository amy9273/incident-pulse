import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app_database.dart';

/// Riverpod provider for AppDatabase singleton.
final appDatabaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(() {
    db.close();
  });
  return db;
});
