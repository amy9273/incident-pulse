import '../../features/incidents/data/incident_local_data_source.dart';
import '../../features/incidents/data/incident_remote_data_source.dart';
import '../../features/incidents/domain/outbox_action.dart';

/// Service responsible for draining and synchronizing the transactional outbox queue.
/// Invariant #5: Offline Action Safety.
class OutboxSyncService {
  final IncidentLocalDataSource _localDataSource;
  final IncidentRemoteDataSource _remoteDataSource;

  OutboxSyncService({
    required IncidentLocalDataSource localDataSource,
    required IncidentRemoteDataSource remoteDataSource,
  })  : _localDataSource = localDataSource,
        _remoteDataSource = remoteDataSource;

  /// Sync all pending outbox actions. Returns the number of synced items.
  Future<int> syncOutbox() async {
    final pendingActions = await _localDataSource.getPendingOutboxActions();
    if (pendingActions.isEmpty) return 0;

    int syncedCount = 0;

    for (final action in pendingActions) {
      try {
        // Mark as syncing
        await _localDataSource.updateOutboxAction(
          action.copyWith(status: OutboxStatus.syncing),
        );

        // Execute remote API call based on action type
        switch (action.action) {
          case OutboxActionType.acknowledge:
            await _remoteDataSource.acknowledgeIncident(action.incidentId);
            break;
          case OutboxActionType.resolve:
            String? note;
            if (action.payload != null &&
                action.payload!['resolutionNote'] != null) {
              note = action.payload!['resolutionNote'] as String;
            }
            await _remoteDataSource.resolveIncident(
              action.incidentId,
              resolutionNote: note,
            );
            break;
        }

        // Action succeeded: delete outbox entry and clear local update lock
        await _localDataSource.deleteOutboxAction(action.id);
        await _localDataSource.markIncidentSynced(action.incidentId);
        syncedCount++;
      } catch (e) {
        // Action failed: record error and increment retry count for backoff
        await _localDataSource.updateOutboxAction(
          action.copyWith(
            status: OutboxStatus.failed,
            retryCount: action.retryCount + 1,
            lastError: e.toString().replaceFirst('Exception: ', ''),
          ),
        );
      }
    }

    return syncedCount;
  }
}
