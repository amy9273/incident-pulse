# Progress Tracker — IncidentPulse

*Update this file after every meaningful implementation step or architectural decision.*

---

## Current Phase
- **Phase 1: Project Setup & Backend Core Engine**

## Current Goal
- Define and implement Prisma relational schema, run initial migrations against Neon PostgreSQL, generate typed client, and seed baseline test data (Unit 02).

---

## Completed
- [x] Initialized Six-File Context methodology docs (`project-overview.md`, `architecture.md`, `code-standards.md`, `ai-workflow-rules.md`, `ui-context.md`, `progress-tracker.md`).
- [x] Defined build plan and decomposed initial units in `context/specs/00-build-plan.md`.
- [x] **Unit 01: Monorepo Foundation & Docker Environment**: Configured monorepo root workspaces, `.env.example`, `docker-compose.yml`, strict Zod env parsing, and Express API skeleton with passing integration tests for `/health/live` and `/health/ready` against live Neon PostgreSQL and Redis Cloud.

---

## In Progress
- [ ] **Unit 02: Database Models & Prisma Schema**: Defining relational models (`User`, `Team`, `TeamMembership`, `Service`, `EscalationPolicy`, `EscalationRule`, `Schedule`, `ScheduleShift`, `Incident`, `IncidentLog`), running migrations against Neon PostgreSQL, and seeding test data.

---

## Next Up
- [ ] Unit 03: Authentication & Service Key Verification Middleware.
- [ ] Unit 04: Webhook Ingestion Endpoint with Fingerprint Deduplication.
- [ ] Unit 05: BullMQ Escalation State Machine Worker.

---

## Open Questions
- *None currently.*

---

## Architecture Decisions
- **Monorepo Structure**: Using `npm workspaces` monorepo containing `apps/api`, `apps/web`, `apps/mobile`, and `packages/shared` for cohesive type sharing and versioning.
- **Cloud Databases**: Neon PostgreSQL and Redis Cloud (co-located in AWS Singapore `ap-southeast-1`), providing serverless Postgres with branching and persistent high-availability Redis for BullMQ delayed queues.
- **Escalation Engine Timers**: Decided on Redis + BullMQ delayed jobs to ensure state machine timers persist across process restarts.
- **WebSocket Protocol**: Using Socket.io for guaranteed fallback, automatic reconnection, and room-based tenant dispatching.

---

## Session Notes
- Unit 01 completed, verified, and pushed on `feat/unit-01-monorepo-docker-setup`.
- Ready to branch into `feat/unit-02-prisma-models-migrations` and write `context/specs/02-database-models-prisma.md`.
