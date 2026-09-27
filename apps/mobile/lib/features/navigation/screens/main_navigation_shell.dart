import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/notifications/notification_provider.dart';
import 'package:mobile/core/notifications/push_notification_service.dart';
import 'package:mobile/core/realtime/socket_provider.dart';
import 'package:mobile/core/theme/app_colors.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/theme/app_typography.dart';
import 'package:mobile/core/widgets/empty_state_widget.dart';
import 'package:mobile/core/widgets/error_state_widget.dart';
import 'package:mobile/core/widgets/primary_button.dart';
import 'package:mobile/core/widgets/skeleton_widget.dart';
import 'package:mobile/core/widgets/status_badge_widget.dart';
import 'package:mobile/features/auth/presentation/controllers/auth_controller.dart';
import 'package:mobile/features/incidents/domain/incident_model.dart';
import 'package:mobile/features/incidents/presentation/controllers/incidents_controller.dart';
import 'package:mobile/features/incidents/presentation/screens/incident_detail_screen.dart';
import 'package:mobile/features/incidents/presentation/widgets/emergency_alert_banner.dart';
import 'package:mobile/features/incidents/presentation/widgets/incident_card_widget.dart';
import 'package:mobile/features/incidents/presentation/widgets/sync_status_banner.dart';

/// Main navigation shell providing bottom tabs for Incidents, Schedules, and Profile.
class MainNavigationShell extends ConsumerStatefulWidget {
  const MainNavigationShell({super.key});

  @override
  ConsumerState<MainNavigationShell> createState() =>
      _MainNavigationShellState();
}

class _MainNavigationShellState extends ConsumerState<MainNavigationShell> {
  int _currentIndex = 0;
  PushAlertEvent? _activeAlert;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final token = ref.read(authControllerProvider).token;
      ref.read(socketServiceProvider).connect(authToken: token);
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final user = authState.user;
    final incidentsState = ref.watch(incidentsControllerProvider);

    // Listen for incoming emergency push alerts
    ref.listen<AsyncValue<PushAlertEvent>>(incomingAlertStreamProvider, (
      previous,
      next,
    ) {
      next.whenData((alert) {
        setState(() {
          _activeAlert = alert;
        });
      });
    });

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.triggered.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.radio_button_checked,
                color: AppColors.triggered,
                size: 16,
              ),
            ),
            const SizedBox(width: 10),
            const Text('IncidentPulse'),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Simulate Emergency P1 Alert',
            icon: const Icon(
              Icons.crisis_alert,
              size: 20,
              color: AppColors.triggered,
            ),
            onPressed: () {
              ref.read(pushNotificationServiceProvider).simulateIncomingAlert();
            },
          ),
          IconButton(
            tooltip: incidentsState.pendingOutboxCount > 0
                ? '${incidentsState.pendingOutboxCount} offline actions pending'
                : 'All synced with server',
            icon: Icon(
              incidentsState.pendingOutboxCount > 0
                  ? Icons.cloud_upload
                  : Icons.cloud_done,
              color: incidentsState.pendingOutboxCount > 0
                  ? AppColors.acknowledged
                  : AppColors.resolved,
              size: 20,
            ),
            onPressed: () {
              if (incidentsState.pendingOutboxCount > 0) {
                ref.read(incidentsControllerProvider.notifier).syncOutbox();
              }
            },
          ),
          IconButton(
            tooltip: 'Sign Out',
            icon: const Icon(Icons.logout_rounded, size: 20),
            onPressed: () {
              ref.read(authControllerProvider.notifier).logout();
            },
          ),
        ],
      ),
      body: Column(
        children: [
          if (_activeAlert != null)
            EmergencyAlertBanner(
              event: _activeAlert!,
              onDismiss: () {
                setState(() {
                  _activeAlert = null;
                });
              },
              onOpen: () {
                final alert = _activeAlert!;
                setState(() {
                  _activeAlert = null;
                });
                final existing = incidentsState.incidents.firstWhere(
                  (i) => i.id == alert.incidentId,
                  orElse: () => IncidentModel(
                    id: alert.incidentId,
                    title: alert.title,
                    serviceId: alert.serviceName.toLowerCase().replaceAll(
                      ' ',
                      '-',
                    ),
                    serviceName: alert.serviceName,
                    status: IncidentStatus.triggered,
                    urgency: alert.urgency,
                    fingerprint: alert.fingerprint ?? alert.incidentId,
                    createdAt: alert.receivedAt,
                    updatedAt: alert.receivedAt,
                    payload: alert.payload,
                  ),
                );
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => IncidentDetailScreen(incident: existing),
                  ),
                );
              },
            ),
          Expanded(
            child: IndexedStack(
              index: _currentIndex,
              children: [
                _IncidentsTab(userName: user?.name ?? 'Responder'),
                const _SchedulesTab(),
                _ProfileTab(user: user),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        items: [
          BottomNavigationBarItem(
            icon: const Icon(Icons.warning_amber_rounded),
            activeIcon: const Icon(Icons.warning_rounded),
            label: incidentsState.pendingOutboxCount > 0
                ? 'Incidents (${incidentsState.pendingOutboxCount})'
                : 'Incidents',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.calendar_today_outlined),
            activeIcon: Icon(Icons.calendar_today_rounded),
            label: 'Schedules',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class _IncidentsTab extends ConsumerWidget {
  final String userName;

  const _IncidentsTab({required this.userName});

  void _showResolveDialog(
    BuildContext context,
    WidgetRef ref,
    IncidentModel incident,
  ) {
    final noteController = TextEditingController();

    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Resolve Incident'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Confirm resolution for "${incident.title}".',
              style: AppTypography.bodyMedium,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: noteController,
              decoration: const InputDecoration(
                labelText: 'Resolution Root-Cause Note (Optional)',
                hintText: 'e.g., Restarted replica pool, latency normalized',
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(dialogCtx).pop();
              ref
                  .read(incidentsControllerProvider.notifier)
                  .resolveIncident(
                    incident.id,
                    resolutionNote: noteController.text.trim(),
                  );
            },
            child: const Text('Resolve'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.colors;
    final incidentsState = ref.watch(incidentsControllerProvider);
    final controller = ref.read(incidentsControllerProvider.notifier);

    return RefreshIndicator(
      onRefresh: () => controller.loadIncidents(forceRefresh: true),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Greeting & Active Status banner
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: colors.surfaceSecondary,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: colors.border),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  child: Text(
                    userName.isNotEmpty ? userName[0].toUpperCase() : 'R',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Welcome, $userName',
                        style: AppTypography.titleMedium,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Offline cache active • Local SQLite sync ready',
                        style: AppTypography.bodySmall.copyWith(
                          color: colors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const StatusBadgeWidget(status: IncidentStatus.triggered),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Offline Outbox Sync Status Banner
          SyncStatusBanner(
            pendingCount: incidentsState.pendingOutboxCount,
            onSyncNow: () => controller.syncOutbox(),
          ),

          // Active Triage Section
          Text('Emergency Triage Queue', style: AppTypography.headlineMedium),
          const SizedBox(height: 4),
          Text(
            'Showing active incidents cached in local SQLite storage',
            style: AppTypography.bodySmall.copyWith(
              color: colors.textSecondary,
            ),
          ),
          const SizedBox(height: 16),

          // 4-State UI Handling
          if (incidentsState.isLoading && incidentsState.incidents.isEmpty) ...[
            // 1. Loading State (Shimmer skeleton cards)
            ...List.generate(
              3,
              (index) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Container(
                  height: 130,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: colors.surfaceSecondary,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: colors.border),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          SkeletonWidget(width: 90, height: 20),
                          SkeletonWidget(width: 50, height: 14),
                        ],
                      ),
                      SizedBox(height: 12),
                      SkeletonWidget(width: 220, height: 16),
                      SizedBox(height: 8),
                      SkeletonWidget(width: 140, height: 12),
                    ],
                  ),
                ),
              ),
            ),
          ] else if (incidentsState.errorMessage != null &&
              incidentsState.incidents.isEmpty) ...[
            // 2. Error State with Retry
            ErrorStateWidget(
              message: incidentsState.errorMessage!,
              onRetry: () => controller.loadIncidents(forceRefresh: true),
            ),
          ] else if (incidentsState.incidents.isEmpty) ...[
            // 3. Empty State with CTA
            EmptyStateWidget(
              icon: Icons.check_circle_outline_rounded,
              title: 'All Systems Operational',
              description:
                  'No active incidents requiring immediate triage. Your services are healthy!',
              actionLabel: 'Refresh Incident Feed',
              onAction: () => controller.loadIncidents(forceRefresh: true),
            ),
          ] else ...[
            ...incidentsState.incidents.map((IncidentModel incident) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: IncidentCardWidget(
                  incident: incident,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) =>
                            IncidentDetailScreen(incident: incident),
                      ),
                    );
                  },
                  onAcknowledge: () async {
                    await ref.read(hapticServiceProvider).acknowledgeImpact();
                    await controller.acknowledgeIncident(incident.id);
                  },
                  onResolve: () async {
                    await ref.read(hapticServiceProvider).resolveImpact();
                    if (!context.mounted) return;
                    _showResolveDialog(context, ref, incident);
                  },
                ),
              );
            }),
          ],
        ],
      ),
    );
  }
}

class _SchedulesTab extends ConsumerWidget {
  const _SchedulesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.colors;
    final user = ref.watch(authControllerProvider).user;
    final responderName = user?.name ?? 'Sarah Chen';

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'On-Call Coverage',
                  style: AppTypography.headlineMedium,
                ),
                const SizedBox(height: 2),
                Text(
                  'Active shift rotations & escalation routing',
                  style: AppTypography.bodySmall.copyWith(
                    color: colors.textSecondary,
                  ),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: colors.resolved.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: colors.resolved.withValues(alpha: 0.4),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: colors.resolved,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'ACTIVE SHIFT',
                    style: TextStyle(
                      color: colors.resolved,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Active Shift Main Card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: Theme.of(context).colorScheme.primary,
                      child: Text(
                        responderName.isNotEmpty
                            ? responderName[0].toUpperCase()
                            : 'S',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                responderName,
                                style: AppTypography.titleMedium,
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: colors.triggered.withValues(
                                    alpha: 0.15,
                                  ),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(
                                    color: colors.triggered.withValues(
                                      alpha: 0.3,
                                    ),
                                  ),
                                ),
                                child: Text(
                                  'Level 1 Primary',
                                  style: TextStyle(
                                    color: colors.triggered,
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Core Payments Rotation • Shift ends in 4h 12m',
                            style: AppTypography.bodySmall.copyWith(
                              color: colors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(height: 1),
                const SizedBox(height: 12),

                // Timing & Timezone
                Row(
                  children: [
                    Icon(
                      Icons.schedule,
                      size: 16,
                      color: colors.textSecondary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Mon 09:00 - Mon 09:00 (UTC)',
                      style: AppTypography.bodySmall.copyWith(
                        color: colors.textSecondary,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: colors.surfaceSecondary,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'UTC+00:00',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: colors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Monitored Services Under Active Coverage
        Text(
          'Monitored Services Under Coverage',
          style: AppTypography.titleMedium,
        ),
        const SizedBox(height: 8),
        Card(
          child: Column(
            children: [
              const ListTile(
                dense: true,
                leading: Icon(Icons.dns, size: 20),
                title: Text(
                  'Payment API Gateway',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text('Direct Webhook Ingestion • Tier 1'),
                trailing: StatusBadgeWidget(status: IncidentStatus.resolved),
              ),
              Divider(height: 1, color: colors.border),
              const ListTile(
                dense: true,
                leading: Icon(Icons.hub_outlined, size: 20),
                title: Text(
                  'Billing Worker Queue',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text('BullMQ Delayed Escalation • Tier 1'),
                trailing: StatusBadgeWidget(status: IncidentStatus.resolved),
              ),
              Divider(height: 1, color: colors.border),
              const ListTile(
                dense: true,
                leading: Icon(Icons.storage_outlined, size: 20),
                title: Text(
                  'Postgres Replica Pool',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text('Multi-Tier Automated Failover • Tier 1'),
                trailing: StatusBadgeWidget(status: IncidentStatus.resolved),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Secondary Escalation Contact Card
        Text(
          'Secondary Escalation Backup (Level 2)',
          style: AppTypography.titleMedium,
        ),
        const SizedBox(height: 8),
        Card(
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: colors.surfaceSecondary,
              child: const Text(
                'AK',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            title: const Text(
              'Alex Kumar (Platform Lead)',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            subtitle: const Text(
              'Escalates automatically after 5m unacknowledged',
            ),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: colors.surfaceSecondary,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: colors.border),
              ),
              child: const Text(
                'Tier 2',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ProfileTab extends ConsumerWidget {
  final dynamic user;

  const _ProfileTab({required this.user});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.colors;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: CircleAvatar(
              radius: 40,
              backgroundColor: Theme.of(context).colorScheme.primary,
              child: Text(
                user != null && user.name.isNotEmpty
                    ? user.name[0].toUpperCase()
                    : 'U',
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            user?.name ?? 'Responder',
            style: AppTypography.headlineMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            user?.email ?? '',
            style: AppTypography.bodyMedium.copyWith(
              color: colors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Center(
            child: Chip(
              label: Text(
                user?.role ?? 'RESPONDER',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
              backgroundColor: colors.surfaceSecondary,
            ),
          ),
          const SizedBox(height: 32),

          Card(
            child: Column(
              children: [
                const ListTile(
                  leading: Icon(Icons.offline_pin_outlined),
                  title: Text('SQLite Offline Cache'),
                  subtitle: Text('Local transactional storage enabled'),
                  trailing: Icon(Icons.check_circle, color: AppColors.resolved),
                ),
                Divider(height: 1, color: colors.border),
                const ListTile(
                  leading: Icon(Icons.sync_alt_rounded),
                  title: Text('Transactional Outbox Pattern'),
                  subtitle: Text('Auto-sync on network reconnect'),
                  trailing: Icon(Icons.check_circle, color: AppColors.resolved),
                ),
                Divider(height: 1, color: colors.border),
                const ListTile(
                  leading: Icon(Icons.security),
                  title: Text('UUIDv4 Entity Uniformity'),
                  subtitle: Text('Collision-free offline synchronization'),
                  trailing: Icon(Icons.check_circle, color: AppColors.resolved),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),
          PrimaryButton(
            label: 'Sign Out',
            isDestructive: true,
            icon: Icons.logout,
            onPressed: () {
              ref.read(authControllerProvider.notifier).logout();
            },
          ),
        ],
      ),
    );
  }
}
