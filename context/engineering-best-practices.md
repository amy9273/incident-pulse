# Comprehensive Engineering Best Practices — IncidentPulse

This document serves as the master engineering playbook for IncidentPulse across Backend, Full-Stack Web, and Mobile. Every contributor and AI agent must adhere to these standards.

---

## 1. Code Readability & Function Design

- **Single Responsibility Principle (SRP)**:
  - Each function should do exactly **one thing** and do it well. If a function is validating input, querying the database, formatting a date, and sending an email, split it into distinct helper functions.
  - Target function length: under 30 lines. Target file length: under 200 lines.
- **Guard Clauses & Early Returns**:
  - Eliminate the "Pyramid of Doom" (deeply nested `if/else` chains).
  - Handle edge cases, invalid inputs, and auth checks first with immediate returns.
  ```typescript
  // ❌ BAD: Deep nesting
  function processAlert(alert: Alert) {
    if (alert.isValid) {
      if (alert.service) {
        if (!alert.isMuted) {
          // do work
        }
      }
    }
  }

  // ✅ GOOD: Early returns
  function processAlert(alert: Alert) {
    if (!alert.isValid) return { error: "INVALID_ALERT" };
    if (!alert.service) return { error: "SERVICE_NOT_FOUND" };
    if (alert.isMuted) return { status: "MUTED" };

    return handleActiveAlert(alert);
  }
  ```
- **Self-Documenting Naming**:
  - Use clear, intention-revealing names:
    - Booleans: `is`, `has`, `should`, `can` prefixes (e.g. `isEscalated`, `hasActiveShift`).
    - Functions: Verb + Noun (e.g. `createIncident`, `cancelEscalationTimer`).
    - Handlers: `handle` or `on` prefix (e.g. `handleIncidentAck`, `onShiftExpire`).
  - No cryptic abbreviations (use `incidentRepository`, never `incRepo` or `ir`).
- **Function Parameter Count**:
  - Maximum 3 positional parameters. If a function requires more than 3 arguments, group them into a typed options/config object:
  ```typescript
  // ✅ GOOD
  interface DispatchNotificationOptions {
    incidentId: string;
    targetUserId: string;
    urgency: "HIGH" | "LOW";
    channel: "PUSH" | "EMAIL";
  }
  async function dispatchNotification(opts: DispatchNotificationOptions) { ... }
  ```
- **Pure Functions & Immutability**:
  - Prefer pure functions for business calculations (e.g., calculating on-call rotation schedules or MTTR). Given the same inputs, a pure function always returns the exact same output without side effects.

---

## 2. File Separation, Modularity & Directory Structure

- **Vertical Slice / Feature Modularity**:
  - Keep related files close together. Group by feature domain before grouping by technical type:
  ```
  features/incidents/
  ├── components/       # UI specific to incidents
  ├── hooks/            # React Query hooks for incidents
  ├── services/         # API calls for incidents
  └── types/            # DTOs and type definitions
  ```
- **Avoid Barrel Export Hell (`index.ts`)**:
  - Do not create giant `index.ts` files that re-export 50 modules. In modern bundlers (Next.js/Vite), giant barrel files ruin tree-shaking and create circular dependency issues. Import directly from the specific module path.
- **Strict Layer Separation**:
  - **Controllers**: Only inspect HTTP headers/body, invoke service, return response.
  - **Services**: Contain pure business logic and orchestration. No raw HTTP `req` or `res` objects.
  - **Repositories / Database**: Contain Prisma/SQL queries. Never call UI or send HTTP responses.
  - **UI Components**: Presentational and user interaction only. Data fetching is delegated to custom hooks.

---

## 3. System Architecture & Scalability

- **Dependency Inversion / Decoupling**:
  - High-level modules must not depend on low-level implementation details. Inject interfaces or configuration objects so services can be unit-tested with mock databases or mock notification dispatchers.
- **Event-Driven Decoupling**:
  - When an incident is acknowledged, do not run 5 synchronous side-effects (update DB, send Slack alert, send push notification, update analytics, log metric) in a single synchronous HTTP request handler.
  - Instead, execute the core DB update, emit a domain event (`incident.acknowledged`), and let asynchronous workers handle notifications and secondary tasks.
- **Graceful Shutdown**:
  - Production servers must handle `SIGTERM` and `SIGINT` signals:
    1. Stop accepting new incoming HTTP connections.
    2. Allow ongoing in-flight requests to finish (e.g. 5s timeout).
    3. Gracefully pause and close BullMQ queue workers.
    4. Close PostgreSQL connection pool and Redis clients.
    5. Exit with code 0.

---

## 4. Models, Schema Design & Type Safety

- **Parse at the Boundary (Parse, Don't Validate)**:
  - Unknown incoming data (HTTP requests, webhook payloads, local storage) must be parsed through strict Zod schemas at runtime before entering the system.
- **DTOs vs Database Entities**:
  - Never return raw database records directly to the client. A database entity may contain sensitive columns (`passwordHash`, internal flags, soft-delete metadata).
  - Always map entities to explicit Data Transfer Objects (DTOs) with only the fields the client needs.
- **Immutable Models in Frontend & Mobile**:
  - In Dart/Flutter and React, treat state and models as immutable. Use `copyWith` methods or copy-on-write patterns rather than mutating object properties in place.

---

## 5. Git & GitHub Best Practices

- **NEVER Commit Directly to `main` or `master` (Strictly Protected Branches)**:
  - Direct commits and direct pushes to `main` or `master` are **strictly forbidden**.
  - All work must be developed on an isolated, short-lived branch (`feat/unit-NN-description`, `fix/issue-description`, `chore/task`).
  - Code enters `main` **only** via a Pull Request that has passed all automated CI/CD checks.
- **Branch Protection & CI Gates**:
  - GitHub branch protection rules must require:
    1. Automated CI quality checks to pass (`lint-and-typecheck`, `test-api`, `build-web`).
    2. Branch must be up-to-date with `main` before merging.
- **Squash and Merge for a Clean Linear Git History**:
  - When merging a PR into `main`, use **Squash and Merge** (or Rebase).
  - This collapses multiple exploratory or fixup commits into a single, clean conventional commit on `main`, keeping `git log` bisectable, professional, and easy to audit.
  - Automatically delete feature branches immediately after merging.
- **Conventional Commits**:
  - Format: `<type>(<scope>): <subject>`
  - Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`.
  - Example: `feat(api): implement webhook alert deduplication by fingerprint`
- **Atomic Commits**:
  - One logical unit of change per commit. Every single commit should compile and pass tests. Never commit half-finished, broken code.
- **Branch Naming Standard**:
  - `feat/unit-04-webhook-ingestion`
  - `fix/socket-reconnect-leak`
  - `chore/upgrade-prisma-5`
- **Zero Secrets & Clean Diff Rule**:
  - Never commit `.env`, `.env.local`, API keys, private certificates, or test credentials.
  - Keep `.gitignore` strictly maintained; provide `.env.example` with dummy values.
  - **Clean Diff Rule**: Before committing or opening a PR, run `git diff` to guarantee zero temporary `console.log` statements, `debugger` calls, commented-out dead code, or untracked test scratch files are included.
- **PR Definition of Done**:
  - Every Pull Request must include:
    1. Concise summary of the problem and the solution.
    2. Verification checklist showing all tests passing.
    3. Screenshots or a 10-second GIF for any UI changes.

---

## 6. Performance & Scalability (Frontend, Backend, Mobile)

- **Connection Pooling**:
  - Never create a new database or Redis connection per incoming HTTP request. Use a singleton connection pool (Prisma Client singleton pattern).
- **Client-Side Optimization**:
  - **Debouncing**: Search inputs and filter text boxes must be debounced (300ms) to prevent hammering the backend API.
  - **Virtualization**: Use windowed list rendering (`@tanstack/react-virtual` in Web, `ListView.builder` in Flutter) for long incident feeds to avoid rendering hundreds of off-screen DOM nodes.
  - **Lazy Loading**: Code-split non-critical routes and heavy modals using dynamic imports (`next/dynamic`).
- **Payload Compression & HTTP/2**:
  - Enable `compression` (gzip/brotli) middleware on the Express API for payloads $> 1\text{KB}$.

---

## 7. Security Best Practices (OWASP Top 10 Guardrails)

- **Authentication & Tokens**:
  - Short-lived Access Tokens (15 minutes) + Long-lived Refresh Tokens (7 days) stored securely.
  - Web: Store tokens in `HttpOnly`, `SameSite=Lax`, `Secure` cookies to protect against XSS token theft.
  - Mobile: Store tokens in platform-encrypted storage (`flutter_secure_storage` / Keychain / Keystore).
- **Injection Prevention**:
  - Never construct SQL queries with raw string concatenation. Rely on Prisma's parameterized queries or tagged templates (`prisma.$queryRaw\`...\``).
- **Mass Assignment Protection**:
  - Never do `prisma.service.create({ data: req.body })`. Malicious users can inject unintended fields (e.g. `isAdmin: true` or `organizationId`).
  - Always whitelist fields: `const { name, escalationPolicyId } = validatedBody;`.
- **Rate Limiting & Abuse Prevention**:
  - Apply `express-rate-limit` with Redis storage:
    - Global API: 100 requests per minute per IP.
    - Auth routes (`/auth/login`): 5 requests per minute per IP.
    - Webhook ingestion: 500 requests per minute per Service Key.
- **Security Headers & CORS**:
  - Use `helmet()` middleware in Express.
  - Strictly define allowed CORS origins; never use `origin: "*"` when credentials (`cookies/authorization`) are allowed.

---

## 8. CRUD & API Design Best Practices

- **Semantic HTTP Methods & Status Codes**:
  - `POST /api/v1/incidents` $\rightarrow$ `201 Created`
  - `GET /api/v1/incidents/:id` $\rightarrow$ `200 OK` (or `404 Not Found`)
  - `PATCH /api/v1/incidents/:id` $\rightarrow$ `200 OK` (Partial update; use `PATCH` rather than `PUT` for status transitions)
  - `DELETE /api/v1/incidents/:id` $\rightarrow$ `204 No Content`
  - Validation failure $\rightarrow$ `400 Bad Request` with structured error array
  - Auth failure $\rightarrow$ `401 Unauthorized` (unauthenticated) or `403 Forbidden` (insufficient role)
  - Race condition / duplicate $\rightarrow$ `409 Conflict`
- **Idempotency Keys**:
  - All critical mutating endpoints (especially webhook ingestion and payment/alert triggers) support an `Idempotency-Key: <UUID>` header.
  - Store the result in Redis for 24 hours. If a client retries due to a network timeout, return the cached successful response without re-executing business logic.
- **Cursor-Based Pagination**:
  - For real-time feeds like incidents, avoid SQL offset pagination (`OFFSET 100 LIMIT 20`). Offsets degrade in performance and cause skipped or duplicate items when new alerts arrive.
  - Use cursor pagination (`WHERE id < cursor ORDER BY id DESC LIMIT 20`).
- **Soft Deletes for Business Entities**:
  - Never permanently hard-delete Services, Teams, or Incidents from the database. Use a `deletedAt: DateTime?` column. Queries filter `WHERE deletedAt IS NULL`.

---

## 9. Database Best Practices: Doing Less Work & Slashing Reads

- **Avoid the N+1 Query Problem**:
  - ❌ **BAD**: Fetch 50 incidents, then in a loop query the database 50 times to get each incident's assigned user.
  - ✅ **GOOD**: Use Prisma eager loading (`include: { assignee: true, service: true }`) to fetch data in a single joined or batched query.
- **Select Only What Is Needed (No `SELECT *`)**:
  - Avoid fetching large JSON metadata payloads or large text runbooks when rendering a summary table.
  - Use Prisma `select`:
    ```typescript
    const incidents = await prisma.incident.findMany({
      select: { id: true, title: true, status: true, urgency: true, createdAt: true },
      take: 20,
    });
    ```
- **Strategic Indexing**:
  - Index all Foreign Keys (`serviceId`, `userId`, `escalationPolicyId`).
  - Index frequently filtered and sorted columns (`status`, `createdAt`).
  - Use Composite Indexes for common multi-column queries (e.g. `@@index([serviceId, status])`).
- **Cache-Aside Pattern with Redis**:
  - For high-read, low-write data (e.g. Service Configuration and Escalation Policy definitions):
    1. Read from Redis (`GET service:key:123`).
    2. If cache hit, return immediately (0 database reads).
    3. If cache miss, read from PostgreSQL, write to Redis with a TTL (e.g. 1 hour), and return.
    4. On any update mutation to the Service, delete/invalidate the Redis cache key immediately.
- **Batching Writes**:
  - When ingesting a burst of alerts, buffer them in Redis and use `prisma.incidentLog.createMany(...)` rather than inserting single rows in rapid succession.

---

## 10. Error Handling & Observability

- **Centralized Custom Error Hierarchy**:
  - Define custom application errors inheriting from a base `AppError`:
    - `BadRequestError` (400)
    - `UnauthorizedError` (401)
    - `ForbiddenError` (403)
    - `NotFoundError` (404)
    - `ConflictError` (409)
- **Structured JSON Logging**:
  - Every log entry must be structured JSON, including timestamp, log level, message, and contextual metadata (`incidentId`, `serviceId`, `userId`):
  ```typescript
  logger.info({ incidentId: "inc_123", action: "ACKNOWLEDGE", userId: "usr_456" }, "Incident acknowledged");
  ```
- **Never Swallow Errors Silently**:
  - ❌ **FORBIDDEN**:
    ```typescript
    try {
      await sendNotification();
    } catch (e) {
      // silently ignored
    }
    ```
  - ✅ **REQUIRED**:
    ```typescript
    try {
      await sendNotification();
    } catch (error) {
      logger.error({ error, incidentId }, "Failed to deliver emergency notification");
      // Decide: throw AppError or enqueue to dead letter queue
    }
    ```

---

## 11. Distributed Tracing & Correlation IDs (`AsyncLocalStorage`)

- **Correlation ID vs Request ID**:
  - `X-Request-ID`: Uniquely identifies a single HTTP request attempt (generated at API gateway/middleware).
  - `X-Correlation-ID`: Identifies an entire end-to-end user transaction across microservices, queues, and background jobs.
- **Propagate Without Prop-Drilling (`AsyncLocalStorage`)**:
  - In Node.js, use `node:async_hooks` / `AsyncLocalStorage` to store the request context (correlation ID, authenticated user ID).
  - The structured logger automatically pulls the correlation ID from `AsyncLocalStorage` for every log line without passing `reqId` manually to every function.
- **Outbound Propagation**:
  - When the backend dispatches webhooks or calls third-party APIs, always forward the `X-Correlation-ID` header.

---

## 12. Production Health Probes: Liveness vs. Readiness

Never use a single generic `/health` endpoint in production Kubernetes/Docker environments:

- **Liveness Probe (`GET /health/live`)**:
  - Answers: *"Is the process responsive and the event loop unblocked?"*
  - **Rule**: Keep it extremely lightweight ($< 1\text{ms}$). Returns `200 OK`.
  - ⚠️ **CRITICAL INVARIANT**: **NEVER** check database or Redis connectivity in the liveness probe. If the database experiences a momentary blip, Kubernetes would kill all API pods simultaneously, causing a catastrophic cascade failure.
- **Readiness Probe (`GET /health/ready`)**:
  - Answers: *"Is the service ready to accept incoming user traffic?"*
  - **Rule**: Ping PostgreSQL (`SELECT 1`) and Redis (`PING`). If unreachable, return `503 Service Unavailable` so traffic is temporarily rerouted away without killing the pod.

---

## 13. Offline-First Mobile & The Transactional Outbox Pattern (Flutter)

- **Local-First, Remote-Eventually**:
  - The Flutter UI listens **exclusively** to the local reactive SQLite database (Drift / Sqflite).
  - When the responder taps "Acknowledge", write to local SQLite immediately, update the UI state to `ACKNOWLEDGED` instantly ($< 16\text{ms}$ latency), and queue the operation.
- **The Transactional Outbox Pattern**:
  - To prevent state loss during app crashes between local save and network dispatch, store pending sync tasks in an `outbox` table within the **same atomic SQLite transaction** as the local incident update.
  - A background sync service reads the outbox, dispatches to the API, and deletes the outbox entry upon server `200 OK`.
- **UUID Primary Keys Only**:
  - **NEVER** use auto-incrementing integer IDs (`1, 2, 3...`) for client-created models. Always generate **UUIDv4** locally to eliminate ID collisions when syncing across multiple devices.
- **Tombstones for Deletions**:
  - When an item is deleted offline, write a tombstone record (`isDeleted: true`) rather than immediately dropping the row, ensuring the deletion propagates to the server upon reconnection.

---

## 14. External Integration Resilience: Timeouts, Retries & Circuit Breakers

- **Strict Timeout Budgets**:
  - Every outbound HTTP call (webhook notifications, push notifications) must have an explicit timeout budget (e.g. `timeout: 3000ms`). Never allow default infinite socket timeouts.
- **Exponential Backoff with Full Jitter**:
  - When retrying failed outbound webhooks or database deadlocks, apply exponential backoff with randomized jitter to prevent the "Thundering Herd" problem:
    $$\text{Sleep} = \text{random}(0, \min(M, B \cdot 2^{\text{attempt}}))$$
- **Circuit Breakers**:
  - If a third-party webhook endpoint fails 5 consecutive times, trip the circuit breaker open for 60 seconds to fail fast and avoid wasting worker threads or exhausting socket pools.

