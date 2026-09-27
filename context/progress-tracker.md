# Progress Tracker — IncidentPulse

_Update this file after every meaningful implementation step or architectural decision._

---

## Current Phase

- **Phase 3: Flutter Mobile Responder App (Units 11-13)**
  - Completed: **Unit 11: Flutter Scaffold & Design System**
  - In Progress: **Unit 12: Offline Incident Cache (SQLite & Transactional Outbox Pattern)**

---

## Completed

- [x] Initialized Six-File Context methodology docs (`project-overview.md`, `architecture.md`, `code-standards.md`, `ai-workflow-rules.md`, `ui-context.md`, `progress-tracker.md`).
- [x] Defined build plan and decomposed initial units in `context/specs/00-build-plan.md`.
- [x] **Unit 01: Monorepo Foundation & Docker Environment**: Configured monorepo root workspaces, `.env.example`, `docker-compose.yml`, strict Zod env parsing, and Express API skeleton with passing integration tests for `/health/live` and `/health/ready` against live Neon PostgreSQL and Redis Cloud.
- [x] **Unit 02: Database Models & Prisma Schema**: Defined complete relational schema (`User`, `Team`, `TeamMembership`, `Service`, `EscalationPolicy`, `EscalationRule`, `Schedule`, `ScheduleShift`, `Incident`, `IncidentLog`), created singleton Prisma client pool, generated typed client, created seed fixtures (`src/seeds/seed.ts`), synchronized shared enums/constants in `@incident-pulse/shared`, and verified all TypeScript types and linters.
- [x] **Unit 03: Authentication & Service Key Verification Middleware**: Implemented `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, JWT verification middleware (`authenticateJwt`), RBAC guard (`requireRole`), machine-to-machine service key verification middleware (`authenticateServiceKey`), custom `AppError` exception hierarchy, Zod request schema validation middleware (`validateBody`), shared auth DTOs in `@incident-pulse/shared`, and verified all test cases, types, and linters.
- [x] **Unit 04: Alert Ingestion Webhook & Deduplication Engine**: Implemented `POST /api/v1/webhooks/services/:serviceKey` and `POST /api/v1/webhooks/alert`, Zod schema validation with `WebhookAlertSchema`, deterministic SHA-256 fingerprint generation, atomic transactional deduplication against open incidents (`TRIGGERED` / `ACKNOWLEDGED`), audit log append in `IncidentLog`, and comprehensive test suite.
- [x] **Unit 05: BullMQ Escalation State Machine Worker**: Implemented Redis-backed BullMQ delayed queue (`escalation-queue`) and background worker (`createEscalationWorker`), multi-tier escalation target resolver (`resolveTarget`), automatic escalation state progression on timeout expiration, timer cancellation on `acknowledge`/`resolve` (Invariant #1), incident triage endpoints (`POST /api/v1/incidents/:id/acknowledge`, `POST /api/v1/incidents/:id/resolve`), and full audit history logging.
- [x] **Unit 06: Real-Time WebSocket Server**: Implemented Socket.io server integrated with Express HTTP server, JWT handshake authentication, automatic room subscriptions (`incidents:global`, `user:${userId}`, `service:${serviceId}`, `incident:${incidentId}`), typed broadcast emitters (`incident:created`, `incident:updated`, `incident:escalated`), integrated event broadcasts across `AlertIngestionService`, `IncidentService`, and `EscalationService`, with full typecheck, lint, and test suite verification.
- [x] **Unit 07: Next.js App Shell & Design System**: Scaffolded Next.js App Router in `apps/web` with Tailwind CSS design tokens matching `ui-context.md`, dark/light mode switching (`next-themes`), responsive sidebar and header with live WebSocket indicator, 4-state UI component library (`Skeleton`, `EmptyState`, `ErrorState`, `StatusBadge`, `Button`, `Card`, `Input`), `AuthContext` session persistence, `/login` page with demo quick-select accounts, and production build passing with 10 static prerendered pages.
- [x] **Unit 08: Live Incident Triage Feed**: Implemented real-time incident triage feed with `SocketContext` and `useSocket` hook subscribing to `incidents:global`, TanStack Query hooks (`useIncidents`, `useIncident`, `useAcknowledgeIncident`, `useResolveIncident`, `useTriggerTestAlert`), 1-click Acknowledge and Resolve triage actions with optimistic UI updates, high-density incident row list with semantic badges, `IncidentStatsCards` KPI summary, `IncidentDetailDrawer` showing raw JSON payloads and immutable audit trail timeline, `TriggerAlertModal` for webhook simulation, and keyboard shortcuts (`A`, `R`, `/`, `Esc`).
- [x] **Unit 09: Visual On-Call Schedule Builder**: Implemented visual weekly timeline and rotation management in `apps/web`, backend REST CRUD endpoints (`/api/v1/schedules`, `/api/v1/schedules/:id`, `/api/v1/schedules/:id/shifts`, `/api/v1/users`), active on-call engineer identification with live countdown badges, modal forms for creating schedules and assigning shifts with timezone awareness and instant TanStack Query cache invalidation, and comprehensive integration tests.
- [x] **Unit 10: Service & Webhook Integration Manager**: Implemented monitored service registry, dynamic API key rotation, copyable cURL/Prometheus/Datadog/Node.js webhook integration snippets, multi-tier escalation policy bindings, slide-over testing console with live simulated alert runner and instant feedback, and 100% passing test suites across all 70 test cases.
- [x] **Unit 11: Flutter Scaffold & Design System**: Scaffolded Flutter Clean Architecture application in `apps/mobile` with Riverpod state management, Dio HTTP client with JWT interceptor, secure Keychain/Keystore token storage, Material 3 theme matching `ui-context.md` (Deep Obsidian dark mode `#0B0F19`, light mode `#F8FAFC`, and status tokens), 4-state UI widgets (`SkeletonWidget`, `EmptyStateWidget`, `ErrorStateWidget`, `StatusBadgeWidget` with pulsing beacon, `PrimaryButton` with 56dp touch height), high-contrast login screen with 1-tap demo profile quick-select, authenticated bottom navigation shell with active triage cards, and 100% passing tests and zero analyzer issues.
- [x] **Unit 12: Offline Incident Cache (SQLite & Transactional Outbox Pattern)**: Implemented local SQLite persistence layer (`AppDatabase`, `IncidentTable`, `OutboxTable`) supporting native mobile and desktop FFI test runners, transactional outbox pattern (Invariants #5 & #7) with UUIDv4 primary keys and atomic status updates (< 16ms optimistic UI latency), `OutboxSyncService` background queue drainer with retry tracking, local-first `IncidentRepositoryImpl` with offline fallback, `SyncStatusBanner`, `IncidentCardWidget` with offline queued badge and 1-tap actions, 100% passing tests (9/9), clean dart format, zero analyzer issues, and clean Prettier verification.

---

## Next Up

- [ ] Unit 13: Emergency 1-Tap Triage UI & Push Handling.

---

## Architecture Decisions

- **Monorepo Structure**: Using `npm workspaces` monorepo containing `apps/api`, `apps/web`, `apps/mobile`, and `packages/shared` for cohesive type sharing and versioning.
- **Cloud Databases**: Neon PostgreSQL and Redis Cloud (co-located in AWS Singapore `ap-southeast-1`), providing serverless Postgres with branching and persistent high-availability Redis for BullMQ delayed queues.
- **Escalation Engine Timers**: Decided on Redis + BullMQ delayed jobs to ensure state machine timers persist across process restarts (Invariant #1).
- **WebSocket Protocol**: Using Socket.io for guaranteed fallback, automatic reconnection, and room-based tenant dispatching.
- **Real-Time Client Cache Sync**: WebSockets trigger cache invalidation and targeted updates in TanStack Query (`queryClient.invalidateQueries({ queryKey: ["incidents"] })`), eliminating manual state management while ensuring instant multi-client sync.
- **Deterministic Alert Fingerprinting**: Automatic SHA-256 hashing based on `(serviceId + title + urgency)` guarantees zero duplicate open incidents without requiring manual deduplication keys from monitoring tools.

---

## Session Notes

- Unit 01 completed, verified, and merged to `main`.
- Unit 02 completed on `feat/unit-02-prisma-models-migrations`.
- Unit 03 completed on `feat/unit-03-auth-service-keys` and merged to `main`.
- Unit 04 completed on `feat/unit-04-alert-ingestion-deduplication`.
- Unit 05 completed on `feat/unit-05-escalation-worker-bullmq`.
- Unit 06 completed on `feat/unit-06-realtime-websocket-server`.
- Unit 07 completed on `feat/unit-07-nextjs-app-shell`.
- [x] **Unit 08: Live Incident Triage Feed**: Real-time WebSocket event ingestion, optimistic 1-click Acknowledge/Resolve actions, audit trail timeline drawer, live test alert simulator, keyboard shortcuts, verified with 0 lint errors, 0 typecheck errors, and 100% passing tests.
- Unit 09 completed on `feat/unit-09-visual-oncall-schedule-builder`: Visual weekly timeline, active on-call summary, shift creation modal, timezone awareness, and schedule API integration tests.
- Unit 10 completed on `feat/unit-10-service-webhook-manager`: Monitored service catalog, dynamic key rotation, integration code snippets (cURL, Prometheus, Datadog), and simulated alert runner.
- Unit 11 completed on `feat/unit-11-flutter-scaffold-design-system`: Scaffolded Flutter Clean Architecture application in `apps/mobile`, Material 3 theme extensions matching `ui-context.md`, 4-state UI widgets, secure storage, Riverpod auth, verified with 0 analyzer issues, clean dart format, and 100% passing tests.
