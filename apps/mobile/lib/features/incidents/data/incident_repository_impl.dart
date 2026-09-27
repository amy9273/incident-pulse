import '../../../core/sync/outbox_sync_service.dart';
import '../domain/i_incident_repository.dart';
import '../domain/incident_model.dart';
import 'incident_local_data_source.dart';
import 'incident_remote_data_source.dart';

/// Concrete implementation of IIncidentRepository providing offline-first capabilities.
class IncidentRepositoryImpl implements IIncidentRepository {
  final IncidentLocalDataSource _localDataSource;
  final IncidentRemoteDataSource _remoteDataSource;
  final OutboxSyncService _syncService;

  IncidentRepositoryImpl({
    required IncidentLocalDataSource localDataSource,
    required IncidentRemoteDataSource remoteDataSource,
    required OutboxSyncService syncService,
  }) : _localDataSource = localDataSource,
       _remoteDataSource = remoteDataSource,
       _syncService = syncService;

  @override
  Future<List<IncidentModel>> getIncidents({bool forceRefresh = false}) async {
    // 1. Read cached incidents from local SQLite first (< 16ms latency)
    final cached = await _localDataSource.getAllIncidents();

    // 2. If not forcing refresh and cache has data, return local data immediately
    if (!forceRefresh && cached.isNotEmpty) {
      // Trigger background sync in the background without blocking UI
      _backgroundSync();
      return cached;
    }

    // 3. Otherwise, fetch remote updates and merge
    try {
      // First attempt to flush outbox if any actions were pending
      await _syncService.syncOutbox();

      final remoteIncidents = await _remoteDataSource.fetchIncidents();
      await _localDataSource.upsertRemoteIncidents(remoteIncidents);
      return await _localDataSource.getAllIncidents();
    } catch (_) {
      // If offline or network unavailable, gracefully fall back to local cache
      return cached;
    }
  }

  void _backgroundSync() async {
    try {
      await _syncService.syncOutbox();
      final remote = await _remoteDataSource.fetchIncidents();
      await _localDataSource.upsertRemoteIncidents(remote);
    } catch (_) {
      // Ignore background sync errors when offline
    }
  }

  @override
  Future<IncidentModel?> getIncidentById(String id) async {
    final local = await _localDataSource.getIncidentById(id);
    if (local != null) return local;

    try {
      final remote = await _remoteDataSource.fetchIncidentById(id);
      await _localDataSource.upsertRemoteIncidents([remote]);
      return remote;
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> acknowledgeIncident(String id) async {
    // Atomic local transaction: updates status and queues outbox item
    await _localDataSource.transactionalAcknowledge(id);

    // Opportunistically attempt to drain outbox immediately
    try {
      await _syncService.syncOutbox();
    } catch (_) {
      // Stays queued in outbox for subsequent sync
    }
  }

  @override
  Future<void> resolveIncident(String id, {String? resolutionNote}) async {
    // Atomic local transaction: updates status and queues outbox item
    await _localDataSource.transactionalResolve(
      id,
      resolutionNote: resolutionNote,
    );

    // Opportunistically attempt to drain outbox immediately
    try {
      await _syncService.syncOutbox();
    } catch (_) {
      // Stays queued in outbox for subsequent sync
    }
  }

  @override
  Future<int> getPendingOutboxCount() async {
    return await _localDataSource.getPendingOutboxCount();
  }

  @override
  Future<int> syncPendingOutbox() async {
    return await _syncService.syncOutbox();
  }
}
