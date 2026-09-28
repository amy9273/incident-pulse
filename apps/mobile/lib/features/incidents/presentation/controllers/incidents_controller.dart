import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/database/database_provider.dart';
import 'package:mobile/core/sync/outbox_sync_service.dart';
import 'package:mobile/features/auth/presentation/controllers/auth_controller.dart';
import 'package:mobile/features/incidents/data/incident_local_data_source.dart';
import 'package:mobile/features/incidents/data/incident_remote_data_source.dart';
import 'package:mobile/features/incidents/data/incident_repository_impl.dart';
import 'package:mobile/features/incidents/domain/i_incident_repository.dart';
import 'package:mobile/features/incidents/domain/incident_model.dart';

/// Immutable state holding active incidents list and offline outbox count.
class IncidentsState {
  final bool isLoading;
  final List<IncidentModel> incidents;
  final int pendingOutboxCount;
  final String? errorMessage;

  const IncidentsState({
    this.isLoading = false,
    this.incidents = const [],
    this.pendingOutboxCount = 0,
    this.errorMessage,
  });

  IncidentsState copyWith({
    bool? isLoading,
    List<IncidentModel>? incidents,
    int? pendingOutboxCount,
    String? errorMessage,
  }) {
    return IncidentsState(
      isLoading: isLoading ?? this.isLoading,
      incidents: incidents ?? this.incidents,
      pendingOutboxCount: pendingOutboxCount ?? this.pendingOutboxCount,
      errorMessage: errorMessage,
    );
  }
}

// Providers
final incidentLocalDataSourceProvider = Provider<IncidentLocalDataSource>((
  ref,
) {
  final appDb = ref.watch(appDatabaseProvider);
  return IncidentLocalDataSource(appDb);
});

final incidentRemoteDataSourceProvider = Provider<IncidentRemoteDataSource>((
  ref,
) {
  final apiClient = ref.watch(apiClientProvider);
  return IncidentRemoteDataSource(apiClient);
});

final outboxSyncServiceProvider = Provider<OutboxSyncService>((ref) {
  final local = ref.watch(incidentLocalDataSourceProvider);
  final remote = ref.watch(incidentRemoteDataSourceProvider);
  return OutboxSyncService(localDataSource: local, remoteDataSource: remote);
});

final incidentRepositoryProvider = Provider<IIncidentRepository>((ref) {
  final local = ref.watch(incidentLocalDataSourceProvider);
  final remote = ref.watch(incidentRemoteDataSourceProvider);
  final syncService = ref.watch(outboxSyncServiceProvider);
  return IncidentRepositoryImpl(
    localDataSource: local,
    remoteDataSource: remote,
    syncService: syncService,
  );
});

/// Controller driving incident feed and optimistic offline actions.
class IncidentsController extends StateNotifier<IncidentsState> {
  final IIncidentRepository _repository;

  IncidentsController(this._repository) : super(const IncidentsState()) {
    loadIncidents();
  }

  Future<void> loadIncidents({bool forceRefresh = false}) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final list = await _repository.getIncidents(forceRefresh: forceRefresh);
      final outboxCount = await _repository.getPendingOutboxCount();
      state = state.copyWith(
        isLoading: false,
        incidents: list,
        pendingOutboxCount: outboxCount,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> acknowledgeIncident(String id) async {
    try {
      await _repository.acknowledgeIncident(id);
      // Reload from local cache immediately (< 16ms optimistic response)
      final updatedList = await _repository.getIncidents();
      final outboxCount = await _repository.getPendingOutboxCount();
      state = state.copyWith(
        incidents: updatedList,
        pendingOutboxCount: outboxCount,
      );
    } catch (e) {
      state = state.copyWith(
        errorMessage: 'Failed to acknowledge: ${e.toString()}',
      );
    }
  }

  Future<void> resolveIncident(String id, {String? resolutionNote}) async {
    try {
      await _repository.resolveIncident(id, resolutionNote: resolutionNote);
      // Reload from local cache immediately (< 16ms optimistic response)
      final updatedList = await _repository.getIncidents();
      final outboxCount = await _repository.getPendingOutboxCount();
      state = state.copyWith(
        incidents: updatedList,
        pendingOutboxCount: outboxCount,
      );
    } catch (e) {
      state = state.copyWith(
        errorMessage: 'Failed to resolve: ${e.toString()}',
      );
    }
  }

  Future<void> syncOutbox() async {
    try {
      await _repository.syncPendingOutbox();
      final updatedList = await _repository.getIncidents();
      final outboxCount = await _repository.getPendingOutboxCount();
      state = state.copyWith(
        incidents: updatedList,
        pendingOutboxCount: outboxCount,
      );
    } catch (_) {}
  }
}

final incidentsControllerProvider =
    StateNotifierProvider<IncidentsController, IncidentsState>((ref) {
  final repo = ref.watch(incidentRepositoryProvider);
  return IncidentsController(repo);
});
