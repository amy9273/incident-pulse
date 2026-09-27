import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:mobile/core/constants/api_endpoints.dart';
import 'package:mobile/core/notifications/push_notification_service.dart';

enum SocketConnectionStatus { disconnected, connecting, connected, error }

/// Service managing real-time WebSocket connection to the IncidentPulse API.
class SocketService {
  final PushNotificationService _notificationService;
  final VoidCallback? _onIncidentChanged;

  io.Socket? _socket;
  final StreamController<SocketConnectionStatus> _statusController =
      StreamController<SocketConnectionStatus>.broadcast();

  SocketConnectionStatus _status = SocketConnectionStatus.disconnected;

  SocketService({
    required PushNotificationService notificationService,
    VoidCallback? onIncidentChanged,
  }) : _notificationService = notificationService,
       _onIncidentChanged = onIncidentChanged;

  SocketConnectionStatus get status => _status;
  Stream<SocketConnectionStatus> get statusStream => _statusController.stream;

  /// Initializes and connects the WebSocket client with JWT auth.
  void connect({String? authToken, String? baseUrl}) {
    if (_socket != null && _socket!.connected) return;

    final targetUrl = baseUrl ?? ApiEndpoints.defaultBaseUrl;
    _setStatus(SocketConnectionStatus.connecting);

    try {
      _socket = io.io(
        targetUrl,
        io.OptionBuilder()
            .setTransports(['websocket'])
            .disableAutoConnect()
            .setExtraHeaders(
              authToken != null ? {'Authorization': 'Bearer $authToken'} : {},
            )
            .build(),
      );

      _socket!.onConnect((_) {
        _setStatus(SocketConnectionStatus.connected);
        _socket!.emit('subscribe:incidents');
      });

      _socket!.onDisconnect((_) {
        _setStatus(SocketConnectionStatus.disconnected);
      });

      _socket!.onConnectError((err) {
        _setStatus(SocketConnectionStatus.error);
      });

      // Listen for incident events broadcasted by backend
      _socket!.on('incident:created', (data) {
        if (data is Map<String, dynamic>) {
          _notificationService.handleIncomingPayload(data);
          _onIncidentChanged?.call();
        }
      });

      _socket!.on('incident:updated', (_) {
        _onIncidentChanged?.call();
      });

      _socket!.on('incident:escalated', (data) {
        if (data is Map<String, dynamic>) {
          _notificationService.handleIncomingPayload(data);
          _onIncidentChanged?.call();
        }
      });

      _socket!.connect();
    } catch (e) {
      _setStatus(SocketConnectionStatus.error);
    }
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _setStatus(SocketConnectionStatus.disconnected);
  }

  void _setStatus(SocketConnectionStatus newStatus) {
    _status = newStatus;
    _statusController.add(newStatus);
  }

  void dispose() {
    disconnect();
    _statusController.close();
  }
}
