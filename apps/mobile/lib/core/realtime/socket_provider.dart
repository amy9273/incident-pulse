import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/notifications/notification_provider.dart';
import 'package:mobile/core/realtime/socket_service.dart';
import 'package:mobile/features/incidents/presentation/controllers/incidents_controller.dart';

final socketServiceProvider = Provider<SocketService>((ref) {
  final notificationService = ref.watch(pushNotificationServiceProvider);

  final service = SocketService(
    notificationService: notificationService,
    onIncidentChanged: () {
      ref
          .read(incidentsControllerProvider.notifier)
          .loadIncidents(forceRefresh: true);
    },
  );

  ref.onDispose(() => service.dispose());
  return service;
});

final socketStatusProvider = StreamProvider<SocketConnectionStatus>((ref) {
  final socketService = ref.watch(socketServiceProvider);
  return socketService.statusStream;
});
