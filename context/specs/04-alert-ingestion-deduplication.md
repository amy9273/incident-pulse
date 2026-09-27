# Unit 04: Alert Ingestion Webhook & Deduplication Engine

---

## 1. Goal

Implement the alert ingestion pipeline and deduplication state machine for IncidentPulse:

1. **Webhook Ingestion Endpoints**: Expose `POST /api/v1/webhooks/services/:serviceKey` and `POST /api/v1/webhooks/alert` protected by `authenticateServiceKey`.
2. **Payload Validation**: Validate incoming alert JSON payloads using Zod (`WebhookAlertSchema`).
3. **Deterministic Fingerprint Hashing**: Compute deterministic SHA-256 fingerprint if an alert source does not provide an explicit deduplication key.
4. **Idempotency & Deduplication State Machine (Invariant #2)**:
   - Check if an open incident (`TRIGGERED` or `ACKNOWLEDGED`) with the same fingerprint exists for the target service.
   - **If open incident exists**: Increment `alertCount`, update timestamp, append an audit entry in `IncidentLog` (`"Deduplicated alert received (occurrence #N)"`), and return `200 OK` (`status: "deduplicated"`).
   - **If no open incident exists** (or previous instances are `RESOLVED`): Create a new `Incident` in `TRIGGERED` status, create initial `IncidentLog` entry, and return `201 Created` (`status: "created"`).
5. **Transactional Integrity (Invariant #3)**: Execute incident creation/update and audit logging within an atomic Prisma transaction.

---

## 2. Design & Architecture

### A. Webhook Ingestion Lifecycle

```mermaid
flowchart TD
    A["External Alert (JSON Payload)"] --> B["authenticateServiceKey Middleware"]
    B -->|401 if invalid| Err1["Unauthorized"]
    B -->|Attach req.service| C["validateBody(WebhookAlertSchema)"]
    C -->|400 if invalid| Err2["Validation Error"]
    C --> D["AlertIngestionService.ingestAlert"]

    subgraph Ingestion & Deduplication Transaction
        D --> E{"Fingerprint Provided?"}
        E -->|Yes| F["Use Provided Fingerprint"]
        E -->|No| G["Compute SHA-256(serviceId + title + urgency)"]
        F --> H{"Find Open Incident with (serviceId, fingerprint)?"}
        G --> H

        H -->|Open Found (TRIGGERED / ACKNOWLEDGED)| I["Increment alertCount\nAppend IncidentLog (Deduplicated)\nReturn status: deduplicated (200)"]
        H -->|None Found or all RESOLVED| J["Create Incident (TRIGGERED)\nAppend IncidentLog (TRIGGERED)\nReturn status: created (201)"]
    end
```

### B. Fingerprint Computation Formula

When `fingerprint` is omitted by the caller:
$$\text{fingerprint} = \text{SHA256}(\text{serviceId} + ":" + \text{normalizedTitle} + ":" + \text{urgency})$$
Where $\text{normalizedTitle} = \text{title.trim().toLowerCase()}$.

---

## 3. Implementation Details

### A. Shared Schemas (`packages/shared/src/schemas/webhook.schema.ts`)

- `WebhookAlertSchema`:
  - `title`: `z.string().min(1).max(255)`
  - `summary`: `z.string().max(2000).optional()`
  - `urgency`: `z.nativeEnum(IncidentUrgency).default(IncidentUrgency.HIGH)`
  - `fingerprint`: `z.string().max(255).optional()`
  - `payload`: `z.record(z.unknown()).optional()`
- `WebhookAlertResponseSchema`:
  - `status`: `"created" | "deduplicated"`
  - `incidentId`: `string` (UUID)
  - `alertCount`: `number`
  - `incident`: `IncidentSummaryDto`

### B. Ingestion Service (`apps/api/src/services/alert-ingestion.service.ts`)

- `ingestAlert(service: ServiceContext, data: WebhookAlertRequest): Promise<WebhookAlertResponse>`
- `generateFingerprint(...)`: SHA-256 hashing helper using Node's native `node:crypto`.
- Prisma transaction: `prisma.$transaction(...)`.

### C. Webhook Controller & Routes (`apps/api/src/controllers/webhook.controller.ts`, `apps/api/src/routes/webhook.routes.ts`)

- Mount `/api/v1/webhooks` in Express `app.ts`.

---

## 4. Verification Checklist

- [ ] `packages/shared` compiles and exports webhook alert schemas.
- [ ] Integration tests verify:
  - Valid webhook payload creates a new `TRIGGERED` incident with HTTP 201.
  - Sending duplicate payload with matching fingerprint returns HTTP 200 (`deduplicated`) and increments `alertCount`.
  - Open incident in `ACKNOWLEDGED` status also deduplicates incoming alerts without reverting status.
  - Sending alert after previous incident was `RESOLVED` creates a new `TRIGGERED` incident.
  - Missing or invalid service key returns HTTP 401.
  - Missing title or malformed payload returns HTTP 400 with validation details.
- [ ] `npm run typecheck` passes with zero errors.
- [ ] `npm run lint` passes with zero warnings.
- [ ] `context/progress-tracker.md` updated upon completion.
