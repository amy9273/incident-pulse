import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/widgets/empty_state_widget.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/status_badge_widget.dart';
import '../../auth/presentation/controllers/auth_controller.dart';

/// Main navigation shell providing bottom tabs for Incidents, Schedules, and Profile.
class MainNavigationShell extends ConsumerStatefulWidget {
  const MainNavigationShell({super.key});

  @override
  ConsumerState<MainNavigationShell> createState() =>
      _MainNavigationShellState();
}

class _MainNavigationShellState extends ConsumerState<MainNavigationShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final user = authState.user;

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
            tooltip: 'Live Status',
            icon: const Icon(Icons.wifi, color: AppColors.resolved, size: 20),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Connected to IncidentPulse Real-Time Gateway'),
                  duration: Duration(seconds: 2),
                ),
              );
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
      body: IndexedStack(
        index: _currentIndex,
        children: [
          _IncidentsTab(userName: user?.name ?? 'Responder'),
          const _SchedulesTab(),
          _ProfileTab(user: user),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.warning_amber_rounded),
            activeIcon: Icon(Icons.warning_rounded),
            label: 'Incidents',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.calendar_today_outlined),
            activeIcon: Icon(Icons.calendar_today_rounded),
            label: 'Schedules',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class _IncidentsTab extends StatelessWidget {
  final String userName;

  const _IncidentsTab({required this.userName});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
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
                        'On-call shifts active • Notifications enabled',
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
          const SizedBox(height: 20),

          // Active Triage Section
          Text('Emergency Triage Queue', style: AppTypography.headlineMedium),
          const SizedBox(height: 4),
          Text(
            'Showing active incidents awaiting responder action',
            style: AppTypography.bodySmall.copyWith(
              color: colors.textSecondary,
            ),
          ),
          const SizedBox(height: 16),

          // Demo Incident Card Showcase
          _IncidentCard(
            title: 'High Latency on Payment Gateway',
            service: 'Payment Service',
            status: IncidentStatus.triggered,
            duration: '3m ago',
            urgency: 'HIGH',
          ),
          const SizedBox(height: 12),
          _IncidentCard(
            title: 'Redis Connection Pool Exhaustion',
            service: 'Auth Worker',
            status: IncidentStatus.acknowledged,
            duration: '14m ago',
            urgency: 'HIGH',
          ),
          const SizedBox(height: 12),
          _IncidentCard(
            title: 'PostgreSQL Read Replica Lag > 500ms',
            service: 'Database Core',
            status: IncidentStatus.resolved,
            duration: '1h ago',
            urgency: 'LOW',
          ),
        ],
      ),
    );
  }
}

class _IncidentCard extends StatelessWidget {
  final String title;
  final String service;
  final IncidentStatus status;
  final String duration;
  final String urgency;

  const _IncidentCard({
    required this.title,
    required this.service,
    required this.status,
    required this.duration,
    required this.urgency,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    Color leftBorderColor;
    switch (status) {
      case IncidentStatus.triggered:
        leftBorderColor = colors.triggered;
        break;
      case IncidentStatus.acknowledged:
        leftBorderColor = colors.acknowledged;
        break;
      case IncidentStatus.resolved:
        leftBorderColor = colors.resolved;
        break;
    }

    return Card(
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Left Accent Border (Invariant from ui-context.md)
            Container(
              width: 5,
              decoration: BoxDecoration(
                color: leftBorderColor,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  bottomLeft: Radius.circular(12),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        StatusBadgeWidget(status: status),
                        Text(
                          duration,
                          style: AppTypography.bodySmall.copyWith(
                            color: colors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(title, style: AppTypography.titleMedium),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Icon(
                          Icons.dns_outlined,
                          size: 14,
                          color: colors.textSecondary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          service,
                          style: AppTypography.bodySmall.copyWith(
                            color: colors.textSecondary,
                          ),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: urgency == 'HIGH'
                                ? colors.urgencyHigh.withValues(alpha: 0.15)
                                : colors.urgencyLow.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            urgency,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: urgency == 'HIGH'
                                  ? colors.urgencyHigh
                                  : colors.urgencyLow,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SchedulesTab extends StatelessWidget {
  const _SchedulesTab();

  @override
  Widget build(BuildContext context) {
    return const EmptyStateWidget(
      icon: Icons.calendar_month_outlined,
      title: 'Primary Rotation Active',
      description:
          'You are currently assigned to Tier 1 Escalation for Payment Service and API Gateway until Monday 09:00 UTC.',
      actionLabel: 'Refresh Schedule',
      onAction: null,
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
                ListTile(
                  leading: const Icon(Icons.notifications_active_outlined),
                  title: const Text('Push Notifications'),
                  subtitle: const Text('Emergency priority alerts enabled'),
                  trailing: const Icon(
                    Icons.check_circle,
                    color: AppColors.resolved,
                  ),
                ),
                Divider(height: 1, color: colors.border),
                ListTile(
                  leading: const Icon(Icons.vibration),
                  title: const Text('Emergency Haptics'),
                  subtitle: const Text('High-intensity vibration on alert'),
                  trailing: const Icon(
                    Icons.check_circle,
                    color: AppColors.resolved,
                  ),
                ),
                Divider(height: 1, color: colors.border),
                ListTile(
                  leading: const Icon(Icons.offline_pin_outlined),
                  title: const Text('Local SQLite Cache'),
                  subtitle: const Text('Offline runbook storage ready'),
                  trailing: const Icon(
                    Icons.check_circle,
                    color: AppColors.resolved,
                  ),
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
