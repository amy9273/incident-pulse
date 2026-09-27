# Progress Tracker — IncidentPulse

_Update this file after every meaningful implementation step or architectural decision._

---

## Current Phase

- **Phase 1: Project Setup & Backend Core Engine**

## Current Goal

- Implement BullMQ Escalation State Machine Worker (Unit 05).

---

## Completed

- [x] Initialized Six-File Context methodology docs (`project-overview.md`, `architecture.md`, `code-standards.md`, `ai-workflow-rules.md`, `ui-context.md`, `progress-tracker.md`).
- [x] Defined build plan and decomposed initial units in `context/specs/00-build-plan.md`.
- [x] **Unit 01: Monorepo Foundation & Docker Environment**: Configured monorepo root workspaces, `.env.example`, `docker-compose.yml`, strict Zod env parsing, and Express API skeleton with passing integration tests for `/health/live` and `/health/ready` against live Neon PostgreSQL and Redis Cloud.
- [x] **Unit 02: Database Models & Prisma Schema**: Defined complete relational schema (`User`, `Team`, `TeamMembership`, `Service`, `EscalationPolicy`, `EscalationRule`, `Schedule`, `ScheduleShift`, `Incident`, `IncidentLog`), created singleton Prisma client pool, generated typed client, created seed fixtures (`src/seeds/seed.ts`), synchronized shared enums/constants in `@incident-pulse/shared`, and verified all TypeScript types and linters.
- [x] **Unit 03: Authentication & Service Key Verification Middleware**: Implemented `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, JWT verification middleware (`authenticateJwt`), RBAC guard (`requireRole`), machine-to-machine service key verification middleware (`authenticateServiceKey`), custom `AppError` exception hierarchy, Zod request schema validation middleware (`validateBody`), shared auth DTOs in `@incident-pulse/shared`, and verified all test cases, types, and linters.
- [x] **Unit 04: Alert Ingestion Webhook & Deduplication Engine**: Implemented `POST /api/v1/webhooks/services/:serviceKey` and `POST /api/v1/webhooks/alert`, Zod schema validation with `WebhookAlertSchema`, deterministic SHA-256 fingerprint generation, atomic transactional deduplication against open incidents (`TRIGGERED` / `ACKNOWLEDGED`), audit log append in `IncidentLog`, and comprehensive test suite.

---

## In Progress

- [ ] **Unit 05: BullMQ Escalation State Machine Worker**: Implementing Redis-backed BullMQ queue for delayed escalation timers, multi-tier escalation policy runner, and timer cancellation on acknowledgment.

---

## Next Up

- [ ] Unit 06: Real-Time WebSocket Server.
- [ ] Unit 07: Next.js App Shell & Design System (Phase 2).

---

## Open Questions

- _None currently._

---

## Architecture Decisions

- **Monorepo Structure**: Using `npm workspaces` monorepo containing `apps/api`, `apps/web`, `apps/mobile`, and `packages/shared` for cohesive type sharing and versioning.
- **Cloud Databases**: Neon PostgreSQL and Redis Cloud (co-located in AWS Singapore `ap-southeast-1`), providing serverless Postgres with branching and persistent high-availability Redis for BullMQ delayed queues.
- **Escalation Engine Timers**: Decided on Redis + BullMQ delayed jobs to ensure state machine timers persist across process restarts.
- **WebSocket Protocol**: Using Socket.io for guaranteed fallback, automatic reconnection, and room-based tenant dispatching.
- **Machine-to-Machine Service Keys**: Service key middleware supports `Authorization: Bearer inc_live_...`, `x-service-key` header, or `:serviceKey` URL route parameter, providing flexible webhook integration across different alert providers.
- **Deterministic Alert Fingerprinting**: Automatic SHA-256 hashing based on `(serviceId + title + urgency)` guarantees zero duplicate open incidents without requiring manual deduplication keys from monitoring tools.

---

## Session Notes

- Unit 01 completed, verified, and merged to `main`.
- Unit 02 completed on `feat/unit-02-prisma-models-migrations`.
- Unit 03 completed on `feat/unit-03-auth-service-keys` and merged to `main`.
- Feature branch `feat/unit-04-alert-ingestion-deduplication`: Unit 04 implemented and fully verified with typecheck, linter, schema validation, and Prettier formatting passing cleanly.
