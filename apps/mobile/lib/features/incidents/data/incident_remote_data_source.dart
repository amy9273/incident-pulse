import 'package:dio/dio.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../domain/incident_model.dart';

/// Remote data source executing REST API calls for incidents.
class IncidentRemoteDataSource {
  final ApiClient _apiClient;

  IncidentRemoteDataSource(this._apiClient);

  /// Fetch active incidents list from backend API
  Future<List<IncidentModel>> fetchIncidents() async {
    try {
      final response = await _apiClient.dio.get<Map<String, dynamic>>(
        ApiEndpoints.incidents,
      );

      final data = response.data;
      if (data == null) return [];

      final list = data['incidents'] as List<dynamic>? ?? [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(IncidentModel.fromJson)
          .toList();
    } on DioException catch (e) {
      final errorMsg = e.response?.data is Map<String, dynamic>
          ? (e.response!.data as Map<String, dynamic>)['message'] as String? ??
                'Failed to fetch incidents'
          : e.message ?? 'Network error';
      throw Exception(errorMsg);
    }
  }

  /// Fetch single incident details
  Future<IncidentModel> fetchIncidentById(String id) async {
    try {
      final response = await _apiClient.dio.get<Map<String, dynamic>>(
        ApiEndpoints.incidentDetail(id),
      );

      final data = response.data;
      if (data == null || data['incident'] == null) {
        throw Exception('Incident not found');
      }

      return IncidentModel.fromJson(data['incident'] as Map<String, dynamic>);
    } on DioException catch (e) {
      final errorMsg = e.response?.data is Map<String, dynamic>
          ? (e.response!.data as Map<String, dynamic>)['message'] as String? ??
                'Failed to fetch incident'
          : e.message ?? 'Network error';
      throw Exception(errorMsg);
    }
  }

  /// Dispatch Acknowledge action to API
  Future<void> acknowledgeIncident(String id) async {
    try {
      await _apiClient.dio.post(ApiEndpoints.acknowledgeIncident(id));
    } on DioException catch (e) {
      final errorMsg = e.response?.data is Map<String, dynamic>
          ? (e.response!.data as Map<String, dynamic>)['message'] as String? ??
                'Failed to acknowledge incident'
          : e.message ?? 'Network error';
      throw Exception(errorMsg);
    }
  }

  /// Dispatch Resolve action to API
  Future<void> resolveIncident(String id, {String? resolutionNote}) async {
    try {
      await _apiClient.dio.post(
        ApiEndpoints.resolveIncident(id),
        data: {
          if (resolutionNote != null && resolutionNote.isNotEmpty)
            'resolutionNote': resolutionNote,
        },
      );
    } on DioException catch (e) {
      final errorMsg = e.response?.data is Map<String, dynamic>
          ? (e.response!.data as Map<String, dynamic>)['message'] as String? ??
                'Failed to resolve incident'
          : e.message ?? 'Network error';
      throw Exception(errorMsg);
    }
  }
}
