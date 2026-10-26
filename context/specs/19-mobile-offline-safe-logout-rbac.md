# Unit 19: Mobile Offline Reconciliation, Safe Logout & Client RBAC

---

## 1. Goal

Remediate mobile client persistence leaks, offline sync deadlocks, and missing client-side role guardrails identified in the system audit:

1. **Safe Logout & Local State Purge (DEF-11)**: Ensure that when a user logs out of the Flutter mobile app, all sensitive credentials (`flutter_secure_storage`), cached local incidents and pending mutation outbox items (`sqlite3` / `AppDatabase`), and live WebSocket connections (`SocketService`) are completely destroyed. Prevents unauthorized data access on shared on-call mobile devices.
2. **Offline Outbox Reconciliation & Dead-Letter Handling (DEF-09)**: Enhance `OutboxSyncService` to classify errors during offline sync. Unrecoverable errors (e.g., HTTP 403 Forbidden, 404 Incident Deleted, or 400 Bad Request) must be marked as `FAILED` with error messages rather than causing infinite retry loops that stall the background outbox worker.
3. **Client-Side Role-Based UI Ergonomics (DEF-12)**:
   - **Mobile**: Hide or disable Acknowledge / Resolve triage actions for `VIEWER` accounts on `IncidentCardWidget` and `IncidentDetailScreen`, rendering a clear read-only indicator.
   - **Web**: Disable or hide mutating action buttons (Acknowledge, Resolve, Rotate Service Key, Create Schedule) when logged in as a non-privileged user, providing informative tooltips.

---

## 2. Technical Design & Architecture

### A. Mobile Safe Logout Pipeline (`apps/mobile/lib`)

In `apps/mobile/lib/core/database/app_database.dart`:
```dart
Future<void> clearAllData() async {
  await database.execute('DELETE FROM outbox;');
  await database.execute('DELETE FROM incidents;');
}
```

In `apps/mobile/lib/features/auth/controllers/auth_controller.dart`:
```dart
Future<void> logout() async {
  // 1. Terminate WebSocket subscriptions
  ref.read(socketServiceProvider).disconnect();
  // 2. Clear tokens from secure enclave / keychain
  await ref.read(secureStorageServiceProvider).clearTokens();
  // 3. Purge cached incidents & pending outbox actions from local SQLite
  await ref.read(appDatabaseProvider).clearAllData();
  // 4. Reset authentication state
  state = const AsyncValue.data(null);
}
```

### B. Offline Outbox Reconciliation & Error Classification (`apps/mobile/lib/core/sync/outbox_sync_service.dart`)

- When draining pending mutations:
  - If status code is `400`, `401`, `403`, `404`, or `409` (Client Error / Terminal):
    - Update outbox row `status = 'FAILED'`, `error_message = error.response?.data?.message`.
    - Do not re-attempt indefinitely.
  - If network failure / connection timeout:
    - Increment `retry_count`.
    - If `retry_count >= 5`, mark as `FAILED`.
    - Else back off and retry on next connectivity restoration.

### C. Client-Side RBAC Guards (Web & Mobile)

- **Mobile**:
  - `IncidentCardWidget` & `IncidentDetailScreen`: Check `authController.user?.role`.
  - If `role == UserRole.viewer`:
    - Show `StatusBadgeWidget(label: "Read Only", color: AppColors.muted)` and disable triage swipes/buttons.
- **Web**:
  - `IncidentRow.tsx` & `IncidentDetailDrawer.tsx`:
    - Check `user?.role`. Disable action buttons with tooltip if `role === "VIEWER"`.
  - `ServiceIntegrationDrawer.tsx`:
    - Only display "Rotate Key" button if `user?.role === "ADMIN"`.

---

## 3. Verification & Quality Gates

1. **Mobile Automated Tests**:
   - Test `clearAllData()` in `AppDatabase`.
   - Test `logout()` clears storage, SQLite, and resets auth state.
   - Test `OutboxSyncService` error handling on 4xx terminal responses.
   - Run `flutter test` across `apps/mobile`.
2. **Quality Check Loop**:
   - `npm run typecheck` across all workspaces.
   - `npm run lint` with 0 warnings.
   - `npm run format:check` with Prettier.
