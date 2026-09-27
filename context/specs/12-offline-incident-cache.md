# Unit 12: Offline Incident Cache (SQLite & Transactional Outbox Pattern)

---

## 1. Goal

Implement a resilient, offline-first local persistence layer for the Flutter mobile responder app in `apps/mobile` adhering to the **Transactional Outbox Pattern** (Engineering Best Practices §13, Architectural Invariants #5 & #7):

1. **Local SQLite Database Engine (`core/database/`)**:
   - Structured SQLite schema storing incidents and pending outbox operations.
   - Dual-mode initialization supporting native mobile platforms (Android/iOS) and desktop/headless test runners (`sqflite_common_ffi`).
   - Tables:
     - `incidents`: Full replica of active incidents including status, urgency, service details, and payload metadata.
     - `outbox`: Transactional audit log of queued responder actions (`ACKNOWLEDGE`, `RESOLVE`) awaiting server synchronization.
2. **The Transactional Outbox Pattern (Invariants #5 & #7)**:
   - Atomic state transitions: When a responder acknowledges or resolves an incident, the local incident record is updated and an outbox task is recorded in the **same atomic SQLite transaction**.
   - UUIDv4 Primary Keys: Every outbox entry and client entity uses UUIDv4 to eliminate sync collisions.
   - Optimistic UI updates with $< 16\text{ms}$ local latency regardless of connectivity.
3. **Background Outbox Synchronizer (`sync/outbox_sync_service.dart`)**:
   - Automatically polls and processes pending outbox actions upon network recovery or manual refresh.
   - Outbound REST dispatches to `POST /api/v1/incidents/:id/acknowledge` and `POST /api/v1/incidents/:id/resolve`.
   - Exponential backoff with jitter and retry count tracking. Deletes outbox records upon verified server `200 OK`.
4. **Local-First Incident Repository (`features/incidents/`)**:
   - `IncidentModel` with strict typing and JSON/SQLite serialization.
   - `IncidentLocalDataSource`: Direct SQLite queries and transactional updates.
   - `IncidentRemoteDataSource`: REST calls to fetch active incidents from Express API.
   - `IncidentRepositoryImpl`: Stream/Future-based repository emitting cached records immediately and merging remote updates.
5. **UI Offline Indication & Ergonomics**:
   - Visual indicator showing pending sync items when offline.
   - Seamless offline interaction in airplane mode.
6. **Quality Gates**:
   - Zero untyped `dynamic` maps in models.
   - Unit and integration tests for SQLite schema, transactional outbox operations, and offline sync.
   - `flutter analyze`, `dart format`, and `npm run format:check` pass cleanly.

---

## 2. Directory Structure (`apps/mobile`)

```
apps/mobile/lib/
├── core/
│   ├── database/
│   │   ├── app_database.dart
│   │   ├── tables/
│   │   │   ├── incident_table.dart
│   │   │   └── outbox_table.dart
│   │   └── database_provider.dart
│   └── sync/
│       └── outbox_sync_service.dart
├── features/
│   └── incidents/
│       ├── data/
│       │   ├── incident_local_data_source.dart
│       │   ├── incident_remote_data_source.dart
│       │   └── incident_repository_impl.dart
│       ├── domain/
│       │   ├── incident_model.dart
│       │   ├── outbox_action.dart
│       │   └── i_incident_repository.dart
│       └── presentation/
│           ├── controllers/
│           │   └── incidents_controller.dart
│           └── widgets/
│               ├── incident_card_widget.dart
│               └── sync_status_banner.dart
```

---

## 3. Verification Checklist

- [ ] SQLite database initializes cleanly on mobile and test environments.
- [ ] Atomic transactions ensure local incident updates and outbox insertions succeed or fail together.
- [ ] Outbox synchronizer drains queued actions and updates local state upon server confirmation.
- [ ] Opening app in offline mode displays previously cached incidents without network errors.
- [ ] Unit tests verify SQLite schema, outbox queueing, and retry handling.
- [ ] `flutter analyze` passes with 0 issues.
- [ ] `flutter test` passes with 100% test success.
- [ ] `npm run format:check` passes with zero Prettier warnings.
- [ ] `context/progress-tracker.md` updated with progress.
