import '../network/api_client.dart';
import '../../features/incidents/data/incident_local_data_source.dart';
import '../../features/incidents/data/incident_remote_data_source.dart';
import '../../features/incidents/domain/outbox_action.dart';

/// Service responsible for draining and synchronizing the transactional outbox queue.
/// Invariant #5: Offline Action Safety (DEF-09).
class OutboxSyncService {
  static const int maxRetries = 5;

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
      } on ApiException catch (e) {
        final statusCode = e.statusCode;
        final isTerminal = statusCode != null &&
            (statusCode == 400 ||
                statusCode == 401 ||
                statusCode == 403 ||
                statusCode == 404 ||
                statusCode == 409);

        final nextRetry = action.retryCount + 1;
        final isFailed = isTerminal || nextRetry >= maxRetries;

        await _localDataSource.updateOutboxAction(
          action.copyWith(
            status: isFailed ? OutboxStatus.failed : OutboxStatus.pending,
            retryCount: nextRetry,
            lastError: e.message,
          ),
        );

        // If permanently failed, release the local optimistic lock
        // so subsequent server syncs restore true backend state
        if (isFailed) {
          await _localDataSource.markIncidentSynced(action.incidentId);
        }
      } catch (e) {
        final errorMsg = e.toString().replaceFirst('Exception: ', '');
        final nextRetry = action.retryCount + 1;
        final isFailed = nextRetry >= maxRetries;

        await _localDataSource.updateOutboxAction(
          action.copyWith(
            status: isFailed ? OutboxStatus.failed : OutboxStatus.pending,
            retryCount: nextRetry,
            lastError: errorMsg,
          ),
        );

        if (isFailed) {
          await _localDataSource.markIncidentSynced(action.incidentId);
        }
      }
    }

    return syncedCount;
  }
}
