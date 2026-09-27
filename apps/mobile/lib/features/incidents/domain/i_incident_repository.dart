import 'incident_model.dart';

/// Contract interface for Incident repository with offline-first capabilities.
abstract class IIncidentRepository {
  /// Fetch incidents from local SQLite cache first, syncing with remote if online.
  Future<List<IncidentModel>> getIncidents({bool forceRefresh = false});

  /// Get single incident from local cache or remote.
  Future<IncidentModel?> getIncidentById(String id);

  /// Optimistically acknowledge incident in local SQLite and record outbox task in the same transaction.
  Future<void> acknowledgeIncident(String id);

  /// Optimistically resolve incident in local SQLite and record outbox task in the same transaction.
  Future<void> resolveIncident(String id, {String? resolutionNote});

  /// Count pending outbox items awaiting server synchronization.
  Future<int> getPendingOutboxCount();

  /// Drain and sync pending outbox operations to Express API.
  Future<int> syncPendingOutbox();
}
