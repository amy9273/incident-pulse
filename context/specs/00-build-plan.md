# Build Plan — IncidentPulse

This file defines the decomposed, verifiable units for IncidentPulse in their strict implementation order.

---

## Phase 1: Infrastructure & Backend Core

### Unit 01: Monorepo Foundation & Docker Environment

- **What it builds**: Monorepo root configuration (`package.json`), `apps/api` Express skeleton with AsyncLocalStorage correlation tracing, isolated health probes (`/health/live`, `/health/ready`), and `docker-compose.yml` orchestrating PostgreSQL 16 and Redis 7.
- **Dependencies**: None.
- **Output**: Express API successfully passes health checks against live Neon PostgreSQL and Redis Cloud, with Docker Compose ready for local/CI parity.

### Unit 02: Database Models & Prisma Schema

- **What it builds**: Complete Prisma relational schema (`User`, `Team`, `TeamMembership`, `Service`, `EscalationPolicy`, `EscalationRule`, `Schedule`, `ScheduleShift`, `Incident`, `IncidentLog`), migrations against Neon PostgreSQL, typed Prisma Client, and test seeds.
- **Dependencies**: Unit 01.
- **Output**: Database migrated on Neon PostgreSQL, seeded with test organization, users, services, and escalation policies; Prisma client generated.

### Unit 03: Authentication & Service Key Middleware

- **What it builds**: JWT authentication routes (`/api/v1/auth/login`) and service key verification middleware (`Bearer inc_live_...`).
- **Dependencies**: Unit 02.
- **Output**: Protected routes reject unauthorized requests; valid tokens grant access to user context.

### Unit 04: Alert Ingestion Webhook & Deduplication Engine

- **What it builds**: `POST /api/v1/webhooks/services/:serviceKey` endpoint with Zod validation, payload fingerprint hashing, and deduplication logic.
- **Dependencies**: Unit 03.
- **Output**: Sending duplicate `curl` alert payloads updates the existing open incident without creating duplicates.

### Unit 05: BullMQ Escalation State Machine Worker

- **What it builds**: Redis-backed BullMQ queue for delayed escalation steps. If an incident remains unacknowledged after timeout, automatically increments escalation level and logs transition.
- **Dependencies**: Unit 04.
- **Output**: Incident created -> 30s delay -> escalates to Level 2. If acknowledged before 30s, job is cleanly removed from queue.

### Unit 06: Real-Time WebSocket Server

- **What it builds**: Socket.io server integrated with Express, emitting `incident:created`, `incident:updated`, and `incident:escalated` events to authenticated rooms.
- **Dependencies**: Unit 05.
- **Output**: Socket test script receives instant broadcast when an incident changes state.

---

## Phase 2: Full-Stack Web Dashboard (Next.js)

### Unit 07: Next.js App Shell & Design System

- **What it builds**: Next.js App Router setup in `apps/web`, Tailwind configuration with tokens from `ui-context.md`, navigation sidebar, and auth state management.
- **Dependencies**: Unit 03.
- **Output**: Clean responsive dashboard shell with dark/light theme toggle.

### Unit 08: Live Incident Triage Feed

- **What it builds**: Real-time incident board with TanStack Query and WebSocket connection. Shows active incidents with status badges, pulsing indicator, and 1-click Acknowledge/Resolve.
- **Dependencies**: Unit 06, Unit 07.
- **Output**: Triggering an incident via webhook causes it to pop up on the web screen in real time without refreshing.

### Unit 09: Visual On-Call Schedule Builder

- **What it builds**: Calendar/timeline interface to assign engineers to weekly on-call rotations and view who is currently on-call.
- **Dependencies**: Unit 08.
- **Output**: Interactive calendar allowing drag/click shift creation saved to PostgreSQL.

### Unit 10: Service & Webhook Integration Manager

- **What it builds**: Web UI to create new monitored services, generate API keys, copy sample `curl` commands, and test alert payloads.
- **Dependencies**: Unit 09.
- **Output**: Users can configure a new service and run a built-in "Send Test Alert" button.

---

## Phase 3: Mobile Responder App (Flutter)

### Unit 11: Flutter Scaffold & Design System

- **What it builds**: Flutter project in `apps/mobile`, Material 3 theme configured with `ui-context.md` status tokens, and secure JWT storage.
- **Dependencies**: Unit 03.
- **Output**: App launches with clean login screen and transitions to main navigation.

### Unit 12: Offline Incident Cache (SQLite)

- **What it builds**: Local SQLite storage layer storing active incidents. App reads cached incidents instantly and syncs changes via REST in background.
- **Dependencies**: Unit 11.
- **Output**: Opening the app in Airplane mode displays previously cached incidents.

### Unit 13: Emergency 1-Tap Triage UI & Push Handling

- **What it builds**: High-contrast incident detail screen with prominent 56dp "Acknowledge" and "Resolve" action buttons, haptic feedback, and notification handling.
- **Dependencies**: Unit 12, Unit 06.
- **Output**: Tapping "Acknowledge" immediately updates local state, sends API request, and updates web dashboard via WebSockets.

---

## Phase 4: Production Polish & Portfolio Presentation

### Unit 14: Automated Testing & CI/CD Pipeline

- **What it builds**: GitHub Actions workflow running backend integration tests, web lint/build, and Flutter analyze.
- **Dependencies**: Unit 13.
- **Output**: Green CI checkmark on pull requests.

### Unit 15: Showcase Assets & Interactive Demo Script

- **What it builds**: Root `README.md` with system architecture diagram (Mermaid), API Swagger docs, and a simulation script (`npm run simulate:incident`) that triggers a full end-to-end alert escalation walkthrough.
- **Dependencies**: Unit 14.
- **Output**: Portfolio-ready repository that any hiring manager can evaluate in 60 seconds.

---

## Phase 5: World-Class Platform Polish & Experience Design

### Unit 16: UI/UX & Ergonomics Overhaul (Web & Mobile)

- **What it builds**: Real-time incoming alert flash animations, Web Audio API emergency chime synthesizer, interactive syntax-highlighted JSON viewer with 1-click copy, visual schedule "Now" cursor and shift handoff countdown badge, 24h service uptime sparkline pills, mobile swipe-to-acknowledge triage gesture, safe-area button ergonomics, and interactive on-call rotation card.
- **Dependencies**: Unit 15.
- **Output**: Linear/Vercel/Apple-tier visual fidelity and operator ergonomics across web and mobile.
