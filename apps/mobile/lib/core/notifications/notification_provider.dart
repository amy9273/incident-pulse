import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/notifications/push_notification_service.dart';
import 'package:mobile/core/services/haptic_service.dart';

final hapticServiceProvider = Provider<HapticService>((ref) {
  return const HapticService();
});

final pushNotificationServiceProvider = Provider<PushNotificationService>((
  ref,
) {
  final hapticService = ref.watch(hapticServiceProvider);
  final service = PushNotificationService(hapticService: hapticService);
  ref.onDispose(() => service.dispose());
  return service;
});

final incomingAlertStreamProvider = StreamProvider<PushAlertEvent>((ref) {
  final notificationService = ref.watch(pushNotificationServiceProvider);
  return notificationService.alertStream;
});
