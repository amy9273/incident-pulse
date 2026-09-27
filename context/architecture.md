# Architecture Context — IncidentPulse

## Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Backend API** | Node.js + Express (TypeScript) | REST endpoints, webhook ingestion, business logic |
| **Job Queue & Timers** | Redis + BullMQ | Escalation state machine timers, asynchronous dispatch |
| **Real-Time Sync** | Socket.io / WebSockets | Bi-directional live incident feeds to Web and Mobile |
| **Primary Database** | PostgreSQL + Prisma ORM | Relational data: Incidents, Schedules, Teams, Audit Logs |
| **Web Frontend** | Next.js (TypeScript) + Tailwind CSS | Operator dashboard, schedule builder, analytics |
| **Web UI Components** | shadcn/ui + Radix UI + Lucide Icons | Accessible, high-density monitoring UI components |
| **Mobile App** | Flutter (Dart) | Cross-platform mobile responder app (iOS/Android) |
| **Mobile Local Cache** | SQLite (`sqflite` or `drift`) | Offline-first incident caching and local queue |
| **Notifications** | FCM / Web Push (Mockable in Dev) | Emergency push notifications for on-call engineers |
| **Containerization** | Docker + Docker Compose | Local reproducible orchestration and testing |

---

## System Boundaries & Directory Ownership

```
incident-pulse/
├── apps/
│   ├── api/          # Node.js / Express backend service
│   │   ├── src/
│   │   │   ├── controllers/   # Request/response handlers
│   │   │   ├── services/      # Business logic (Escalation, Ingestion, Notification)
│   │   │   ├── workers/       # BullMQ delayed queue workers
│   │   │   ├── sockets/       # WebSocket event emitters
│   │   │   ├── middlewares/   # Auth, rate limiting, validation
│   │   │   └── prisma/        # Prisma schema and migrations
│   │   └── package.json
│   ├── web/          # Next.js Full-Stack Web Application
│   │   ├── src/
│   │   │   ├── app/           # App router pages (dashboard, incidents, schedules)
│   │   │   ├── components/    # Reusable UI widgets & incident tables
│   │   │   ├── hooks/         # React Query & WebSocket connection hooks
│   │   │   └── lib/           # API client and utility helpers
│   │   └── package.json
│   └── mobile/       # Flutter Mobile Application
│       ├── lib/
│       │   ├── core/          # Network client, theme, local database
│       │   ├── features/      # Modular feature folders (incidents, schedules, auth)
│       │   └── main.dart
│       └── pubspec.yaml
├── packages/
│   └── shared/       # Shared TypeScript types, enums, Zod validation schemas
├── docker-compose.yml
├── context/          # Six-File context documentation & specs
├── AGENTS.md
└── README.md
```

---

## Storage Model

- **PostgreSQL**: Permanent relational storage.
  - `User`, `Team`, `TeamMembership`
  - `Service` (with API keys)
  - `EscalationPolicy`, `EscalationRule` (tiers and delays)
  - `Schedule`, `ScheduleShift` (time-based rotations)
  - `Incident` (`id`, `title`, `status`, `urgency`, `serviceId`, `fingerprint`, `assigneeId`)
  - `IncidentLog` (immutable audit trail of every status change, notification sent, and user action)
- **Redis**: Fast, in-memory ephemeral storage.
  - BullMQ Delayed Queues: Holds scheduled escalation jobs (e.g. "Escalate incident #42 in 300s").
  - Deduplication Cache: Fingerprint locks to prevent alert flooding.
  - Active WebSocket Socket IDs per User.
- **SQLite (Mobile)**:
  - Local device cache of active incidents. Responders can open the app with no connectivity and review incident runbooks.

---

## Auth & Access Model

- **User Authentication**: Standard JWT Bearer token authentication. Responders authenticate with email/password.
- **Service Integration Keys**: External alerts use API keys in the format `Bearer inc_live_[32_char_token]`.
- **Role-Based Access Control (RBAC)**:
  - `Admin`: Manage teams, services, escalation rules, and schedules.
  - `Responder`: Acknowledge and resolve incidents, view team schedules.
  - `Viewer`: Read-only access to incident status and post-mortems.

---

## Architectural Invariants (Unbreakable Rules)

1. **Deterministic Timers**: Escalation delays **MUST** be scheduled as BullMQ delayed jobs in Redis. **NEVER** use in-memory `setTimeout` or `setInterval` (which drop jobs on process restart).
2. **Ingestion Idempotency**: Every webhook alert must carry or generate a `fingerprint`. If an open incident (`TRIGGERED` or `ACKNOWLEDGED`) with the same fingerprint exists for that service, do not create a duplicate incident; increment the alert count and append to the incident log.
3. **Transactional State Machine**: Incident status transitions (`TRIGGERED` $\rightarrow$ `ACKNOWLEDGED` $\rightarrow$ `RESOLVED`) must be executed within database transactions and write an immutable audit log entry in the same transaction.
4. **Boundary Separation**: The Next.js web application must **NEVER** connect directly to the database. All read/write actions must go through the Express REST API and WebSocket events.
5. **Offline Action Safety (Mobile)**: If the mobile app is offline when a responder taps "Acknowledge", the action is saved to a local pending queue and replayed to the API upon reconnection with an idempotent request ID.
6. **Health Probe Isolation**: `GET /health/live` must check process responsiveness only and **NEVER** probe external dependencies (DB or Redis). Deep dependency checks belong exclusively in `GET /health/ready`.
7. **Client ID Uniformity (UUIDv4)**: Any entity created or queued on the client (mobile/web) must use UUIDv4 primary keys to prevent ID collisions during offline synchronization.
