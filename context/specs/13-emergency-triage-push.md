# Unit 13: Emergency 1-Tap Triage UI & Push Handling

---

## 1. Goal

Implement the critical emergency triage interface and real-time push notification alert subsystem for the Flutter Mobile Responder App in `apps/mobile`:

1. **Emergency Incident Detail Screen (`features/incidents/presentation/screens/incident_detail_screen.dart`)**:
   - High-contrast, action-oriented dark mode designed for 3:00 AM wake-ups (compliant with `context/ui-context.md`).
   - Sticky bottom action bar with fat-finger friendly ($56\text{dp}$ touch height) **Acknowledge** and **Resolve** action buttons.
   - Haptic feedback integration:
     - Tapping **Acknowledge**: Medium haptic impact (`HapticFeedback.mediumImpact()`).
     - Tapping **Resolve**: Light haptic confirmation (`HapticFeedback.lightImpact()`).
     - Incoming critical alert: Heavy notification haptic pattern (`HapticFeedback.heavyImpact()`).
   - Comprehensive Incident Breakdown:
     - Status badge with live pulsing beacon for `TRIGGERED` status.
     - Severity indicator (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), service badge, and elapsed time counter.
     - Escalation policy progress indicator (current tier, auto-escalation timer / deadline).
     - Responder assignment card.
     - Collapsible raw JSON alert payload viewer with copy action.
     - Chronological timeline / audit log of incident events.
   - Optimistic execution: tapping Acknowledge or Resolve updates local SQLite cache and outbox immediately ($< 16\text{ms}$) while initiating background sync.

2. **Push Notification & Alerting Engine (`core/notifications/push_notification_service.dart`)**:
   - Decodes standard FCM / APNs JSON payloads (`incidentId`, `title`, `severity`, `urgency`, `serviceName`, `fingerprint`).
   - Emits alert event streams and manages device token registration.
   - Heads-Up Emergency Alert Banner (`features/incidents/presentation/widgets/emergency_alert_banner.dart`):
     - Drops down over any active screen when a critical incident arrives.
     - Provides instant 1-tap Acknowledge directly from the banner or 1-tap tap-to-open to deep-link to the incident detail view.
   - Built-in simulation trigger for manual testing and evaluation without external Firebase dependencies.

3. **Real-Time WebSocket Sync (`core/realtime/socket_service.dart`)**:
   - Riverpod provider establishing Socket.io connection to backend API using JWT authentication.
   - Subscribes to `incidents:global` and `user:{id}` rooms.
   - Ingests `incident:created`, `incident:updated`, and `incident:escalated` events in real time.
   - Triggers the push alert banner and heavy haptic feedback on incoming critical alerts.

4. **Quality Gates**:
   - Zero hardcoded arbitrary colors or sizes (use `AppColors`, `AppTypography`, and 56dp button constraints).
   - Strict 4-state UI handling.
   - Full test coverage with Flutter unit/widget tests for notification parsing, triage triggers, and detail rendering.
   - Passes `flutter test`, `flutter analyze`, `dart format`, and `npm run format:check`.

---

## 2. Directory Structure (`apps/mobile`)

```
apps/mobile/lib/
├── core/
│   ├── notifications/
│   │   ├── push_notification_service.dart
│   │   └── notification_provider.dart
│   ├── realtime/
│   │   ├── socket_service.dart
│   │   └── socket_provider.dart
│   └── services/
│       └── haptic_service.dart
├── features/
│   └── incidents/
│       └── presentation/
│           ├── screens/
│           │   └── incident_detail_screen.dart
│           └── widgets/
│               ├── emergency_alert_banner.dart
│               ├── incident_audit_timeline_widget.dart
│               └── raw_payload_viewer_widget.dart
```

---

## 3. Verification & Quality Acceptance

- [ ] All action buttons adhere to $\ge 56\text{dp}$ touch height.
- [ ] Tapping "Acknowledge" on either card, banner, or detail screen performs optimistic $< 16\text{ms}$ local update and outbox queuing.
- [ ] Push notification simulation triggers heads-up alert banner, heavy haptic pattern, and deep-link navigation.
- [ ] Unit & widget tests pass 100% cleanly.
- [ ] `flutter analyze` reports 0 issues.
- [ ] `dart format` reports 0 unformatted files.
- [ ] Prettier formatting check passes.
