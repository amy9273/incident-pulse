# Unit 02: Database Models & Prisma Schema

---

## 1. Goal

Define the complete relational schema for IncidentPulse using Prisma ORM against PostgreSQL (Neon Serverless / Docker Compose), generate the strongly-typed Prisma Client, implement automated migrations, configure database singleton connection pooling in `apps/api/src/lib/prisma.ts`, write database seeds with initial organization data, and expose shared data types and enums across the monorepo in `packages/shared`.

---

11

## 2. Design & Architecture

### A. Relational Schema & Entity Relationships

- **`User`**: System responders and administrators with email, password hash, role (`ADMIN`, `RESPONDER`, `VIEWER`), and soft delete support.
- **`Team`**: Operational teams (e.g. "Platform Infra", "Payment Services") with unique slugs and soft delete support.
- **`TeamMembership`**: Many-to-many relationship linking `User` and `Team` with membership roles (`LEAD`, `MEMBER`).
- **`Service`**: Monitored technical services that receive alerts, linked to an `EscalationPolicy`, holding unique integration `serviceKey` tokens (e.g., `inc_live_[32_char_hex]`).
- **`EscalationPolicy`**: Policy definitions containing ordered escalation rules.
- **`EscalationRule`**: Multi-tier escalation steps with `stepNumber`, `delayMinutes`, and target routing (`targetType`: `USER` or `SCHEDULE`).
- **`Schedule`**: On-call schedule configuration with timezone support (e.g., `Asia/Singapore`, `UTC`).
- **`ScheduleShift`**: Specific user rotation shift windows with `startTime` and `endTime`.
- **`Incident`**: Core incident entity tracking status (`TRIGGERED`, `ACKNOWLEDGED`, `RESOLVED`), urgency (`HIGH`, `LOW`), `fingerprint` (for deduplication), current `escalationStep`, and lifecycle timestamps.
- **`IncidentLog`**: Immutable, append-only audit trail logging state transitions, notes, and notification dispatches.

### B. Invariants & Best Practice Guardrails

1. **UUIDv4 Primary Keys**: All models use UUIDv4 primary keys (`@id @default(uuid())`).
2. **Soft Deletion**: Business entities (`User`, `Team`, `Service`, `EscalationPolicy`, `Schedule`) include `deletedAt DateTime?`.
3. **Strategic Indexing**:
   - Foreign keys: `serviceId`, `assigneeId`, `escalationPolicyId`, `teamId`, `userId`, `scheduleId`.
   - Incident lookup: Composite indexes on `[serviceId, status]`, `[fingerprint, status]`, and single indexes on `status`, `createdAt`.
   - Schedule lookup: Index on `[scheduleId, startTime, endTime]`.
4. **Connection Pooling (Singleton)**: `apps/api/src/lib/prisma.ts` exports a singleton `PrismaClient` using `globalThis` in development to prevent connection exhaustion.
5. **Shared Types**: Export matching TypeScript enums and DTO interfaces from `packages/shared`.

---

## 3. Implementation Details

### A. Prisma Schema (`apps/api/prisma/schema.prisma`)

- Define enums: `UserRole`, `TeamMemberRole`, `IncidentStatus`, `IncidentUrgency`, `EscalationTargetType`, `IncidentLogAction`.
- Define models and relation mappings with referential actions (`onDelete: Cascade` or `Restrict`).
- Add composite indexes for query optimization.

### B. Prisma Client Singleton (`apps/api/src/lib/prisma.ts`)

- Replaces or integrates with `apps/api/src/lib/db.ts` to provide a robust `PrismaClient` singleton with logging hooks.

### C. Seed Script (`apps/api/prisma/seed.ts`)

- Populates seed data:
  - Default Admin & Responder users (with bcrypt-hashed passwords).
  - Teams: "Platform Infrastructure" and "Core Payment Gateway".
  - Escalation Policies with 2 tiers (Tier 1: 5-minute timeout; Tier 2: 10-minute timeout).
  - Services: "Payment Processing API" and "Auth & Session Service" with live test keys (`inc_live_test_payment_api_key` and `inc_live_test_auth_service_key`).
  - Schedule with active weekly rotation shifts.
  - Baseline sample incidents and incident logs.

### D. Shared Package Exports (`packages/shared/src/`)

- Update shared types to align 1:1 with Prisma enums and models.

---

## 4. Verification Checklist

- [ ] `npx prisma validate` passes with zero schema errors.
- [ ] `npx prisma generate` generates the typed client in `apps/api`.
- [ ] Migration runs cleanly against database (`npx prisma migrate dev` or `prisma db push` / `prisma migrate deploy`).
- [ ] `npm run seed` in `apps/api` populates initial users, teams, services, escalation policies, and schedules.
- [ ] `npm run typecheck` across all workspaces passes with 0 errors.
- [ ] `npm run test` executes health check and database queries successfully.
- [ ] `context/progress-tracker.md` updated with completion notes.
