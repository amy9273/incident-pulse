# Unit 05: BullMQ Escalation State Machine Worker

---

## 1. Goal

Implement the deterministic escalation state machine and delayed job worker using BullMQ backed by Redis:

1. **Deterministic Escalation Scheduling (Invariant #1)**: Schedule delayed jobs in BullMQ (`escalation-queue`) when an incident is created or auto-escalated. Never use in-memory `setTimeout`.
2. **Escalation Policy & Target Resolver**: Resolve escalation targets for each tier:
   - `targetType: USER`: Assigns to the configured target `User`.
   - `targetType: SCHEDULE`: Queries `ScheduleShift` for the currently active on-call engineer at that point in time.
3. **BullMQ Delayed Queue Worker**: Processes escalation events when timers expire. If the incident remains in `TRIGGERED` status, increments `escalationStep`, assigns the next tier target, logs the escalation in `IncidentLog`, and schedules subsequent tiers.
4. **Incident Triage Endpoints**:
   - `POST /api/v1/incidents/:id/acknowledge`: Transitions status to `ACKNOWLEDGED`, cancels pending BullMQ escalation jobs, sets `acknowledgedAt`, and logs audit entry.
   - `POST /api/v1/incidents/:id/resolve`: Transitions status to `RESOLVED`, cancels pending BullMQ escalation jobs, sets `resolvedAt`, and logs audit entry.
   - `GET /api/v1/incidents`: Lists incidents with filtering by status and service.
   - `GET /api/v1/incidents/:id`: Retrieves incident with complete timeline audit logs.

---

## 2. Design & Architecture

### A. Escalation State Machine Flow

```mermaid
flowchart TD
    A["Incident Ingested (TRIGGERED)"] --> B["Resolve Step 1 Target (User / Schedule)"]
    B --> C["Assign Incident to Step 1 Target"]
    C --> D{"Next Escalation Step Exists?"}
    D -->|Yes| E["Schedule BullMQ Delayed Job\n(escalation-queue, delay = N min)"]
    D -->|No| F["Max Tier Reached (No more timers)"]

    subgraph User Actions
        G["Responder Taps Acknowledge"] --> H["Transition status -> ACKNOWLEDGED\nCancel BullMQ Delayed Job"]
        I["Responder Taps Resolve"] --> J["Transition status -> RESOLVED\nCancel BullMQ Delayed Job"]
    end

    subgraph BullMQ Worker Execution
        E -->|Timer Expires| K["Worker Picks Up Delayed Job"]
        K --> L{"Incident Status == TRIGGERED?"}
        L -->|No (ACKNOWLEDGED or RESOLVED)| M["Drop Job / Log Skip"]
        L -->|Yes (Still Unacknowledged)| N["Advance escalationStep -> N+1\nResolve Step N+1 Target\nUpdate Assignee in DB Transaction\nAppend IncidentLog (ESCALATED)"]
        N --> D
    end
```

### B. BullMQ Job Identification

- **Queue Name**: `escalation-queue`
- **Job ID Format**: `escalation:${incidentId}:step:${stepNumber}`
- **Cancellation**: `queue.remove(jobId)` ensures clean removal upon acknowledgment or resolution.

---

## 3. Implementation Details

### A. Shared Schemas (`packages/shared/src/schemas/incident.schema.ts`)

- `IncidentResponseDto`, `IncidentListQuerySchema`, `AcknowledgeIncidentDto`, `ResolveIncidentDto`.

### B. Escalation Policy & Target Resolver (`apps/api/src/services/escalation.service.ts`)

- `resolveTarget(rule: EscalationRule, atTime?: Date): Promise<User | null>`
- `scheduleEscalation(incidentId: string, stepNumber: number, delayMs: number): Promise<void>`
- `cancelEscalation(incidentId: string, stepNumber: number): Promise<void>`
- `executeEscalationStep(incidentId: string, targetStepNumber: number): Promise<void>`

### C. BullMQ Queue & Worker (`apps/api/src/workers/escalation.worker.ts`)

- Configures BullMQ `Queue` and `Worker` using `env.REDIS_URL`.
- Graceful shutdown handling on SIGTERM/SIGINT.

### D. Incident Service & Controller (`apps/api/src/services/incident.service.ts`, `apps/api/src/controllers/incident.controller.ts`, `apps/api/src/routes/incident.routes.ts`)

- Endpoints for `acknowledge`, `resolve`, `list`, and `getById`.

---

## 4. Verification Checklist

- [ ] BullMQ queue and worker connect to Redis cleanly.
- [ ] Integration tests verify:
  - Creating an incident schedules Step 1 assignment and BullMQ delayed job.
  - Delayed escalation worker advances `escalationStep` to Tier 2 when unacknowledged.
  - Acknowledging an incident transitions to `ACKNOWLEDGED` and removes pending escalation job.
  - Resolving an incident transitions to `RESOLVED` and removes pending escalation job.
  - Re-escalation does not occur once an incident is acknowledged.
- [ ] `npm run typecheck` passes with zero errors.
- [ ] `npm run lint` passes with zero warnings.
- [ ] `context/progress-tracker.md` updated upon completion.
