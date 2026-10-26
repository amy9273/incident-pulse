# Unit 18: Queue Reliability, Concurrency & State Machine Integrity

---

## 1. Goal

Remediate reliability, worker lifecycle, and state machine concurrency defects identified in the system audit:

1. **BullMQ Stalled Job Recovery & Concurrency (DEF-04)**: Configure explicit BullMQ worker settings (`concurrency: 5`, `stalledInterval: 30000`, `maxStalledCount: 2`) to ensure unacknowledged stalled jobs from worker crashes or network interruptions are automatically recovered without hanging indefinitely.
2. **Notification & Escalation Retry Backoff & DLQ (DEF-06)**: Configure robust job retry policies (`attempts: 5`, exponential backoff `delay: 2000`, `type: 'exponential'`) and route permanently exhausted jobs to an `escalation-dlq` Dead Letter Queue with audit logs.
3. **Optimistic Locking & Concurrency Guards on State Transitions (DEF-05)**: Guard incident status mutations (`acknowledge`, `resolve`, and automatic `escalate`) against race conditions, ensuring that concurrent requests from multiple engineers or simultaneous timeout triggers cannot produce duplicate logs, out-of-order state progressions, or ghost escalations on already resolved incidents.
4. **Database Transactional Atomicity (DEF-08)**: Wrap all state updates, assignee changes, escalation step increments, and audit log entries inside Prisma interactive transactions (`prisma.$transaction`) so that database or process crashes never leave partial records.
5. **Worker Graceful Shutdown**: Implement clean worker termination handlers allowing in-flight jobs to complete before closing Redis and database pools.

---

## 2. Technical Design & Architecture

### A. BullMQ Queue & Worker Hardening (`apps/api/src/lib/queue.ts`, `apps/api/src/workers/escalation.worker.ts`)

```typescript
export const escalationQueue = new Queue<EscalationJobData>(
  ESCALATION_QUEUE_NAME,
  {
    connection: createQueueRedisConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  },
);

export const escalationDlq = new Queue<EscalationJobData & { error?: string }>(
  "escalation-dlq",
  { connection: createQueueRedisConnection() },
);
```

- Worker settings:
  - `concurrency: 5` (parallel execution for multi-incident processing).
  - `stalledInterval: 30000` (check for stalled jobs every 30 seconds).
  - `maxStalledCount: 2` (retry stalled jobs up to 2 times before failing).
- On failure with exhausted attempts (`job.attemptsMade >= job.opts.attempts`):
  - Enqueue to `escalationDlq`.
  - Append `IncidentLog` entry with action `ESCALATION_FAILED` documenting the exhaustion.

### B. State Machine Concurrency & Transactional Atomicity (`apps/api/src/services/incident.service.ts`, `apps/api/src/services/escalation.service.ts`)

- **Escalation Step Guard**:
  When processing an escalation job for step $N$:
  1. Inside `prisma.$transaction`:
     - Fetch incident: `SELECT id, status, escalationStep, serviceId, escalationPolicyId FROM incidents WHERE id = $1 FOR UPDATE` (or conditional check).
     - If `status === ACKNOWLEDGED` or `status === RESOLVED`, abort escalation immediately (timer cancellation safeguard).
     - If `escalationStep >= nextStepNumber`, abort (idempotent duplicate job execution protection).
     - Perform target resolution, update step and assignee, and create `IncidentLogAction.ESCALATED` in the same transaction.
  2. Outside transaction:
     - Schedule next step delayed job if additional rules exist in the escalation policy.
     - Broadcast WebSocket event `incident:escalated`.

- **Acknowledge & Resolve Atomic Transitions**:
  - `acknowledgeIncident`:
    - Check if already `RESOLVED` $\rightarrow$ throw `ConflictError("Cannot acknowledge an already resolved incident")`.
    - If already `ACKNOWLEDGED`, return existing state idempotently.
    - Atomically update status to `ACKNOWLEDGED`, set `acknowledgedAt`, update assignee if assigned, and create audit log within `prisma.$transaction`.
    - Cancel BullMQ delayed escalation timer.
  - `resolveIncident`:
    - Atomically update status to `RESOLVED`, set `resolvedAt`, and create audit log within `prisma.$transaction`.
    - Cancel BullMQ delayed escalation timer.

---

## 3. Verification & Quality Gates

1. **Automated Integration Tests (`unit18-queue-concurrency.test.ts`)**:
   - Test simultaneous concurrent calls to `acknowledge` and `resolve` ensuring consistency.
   - Test that escalation jobs abort if incident is already acknowledged or resolved.
   - Test retry backoff and DLQ routing on unrecoverable escalation failures.
   - Test worker graceful shutdown.
2. **Quality Check Loop**:
   - `npm run typecheck` across all workspaces.
   - `npm run lint` with zero errors.
   - `npm run format:check`.
   - `npm run test:api` with 100% passing tests.
