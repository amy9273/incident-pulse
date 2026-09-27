# Unit 10: Service & Webhook Integration Manager Spec

## 1. Overview & Objectives

Unit 10 implements the **Service & Webhook Integration Manager** for IncidentPulse. This subsystem empowers platform administrators and DevOps engineers to manage monitored services, generate and rotate machine-to-machine integration API keys (`inc_live_...`), bind services to multi-tier escalation policies, inspect webhook endpoints, copy ready-to-use cURL/JSON code snippets, and trigger live test alerts to verify the end-to-end alert ingestion and deduplication pipeline.

---

## 2. Shared Schemas & DTOs (`packages/shared`)

### `packages/shared/src/schemas/service.schema.ts`

- **`CreateServiceSchema`**:
  - `name`: string (1-100 chars, required)
  - `slug`: string (optional, lowercase alphanumeric with hyphens)
  - `description`: string (optional, max 500 chars)
  - `escalationPolicyId`: UUID (required)
- **`UpdateServiceSchema`**:
  - `name`: string (optional)
  - `slug`: string (optional)
  - `description`: string (optional, nullable)
  - `escalationPolicyId`: UUID (optional)
- **`CreateEscalationPolicySchema`**:
  - `name`: string (required)
  - `description`: string (optional)
  - `teamId`: UUID (optional, nullable)
  - `rules`: array of `{ stepNumber: number, delayMinutes: number, targetType: 'USER' | 'SCHEDULE', targetUserId?: string, targetScheduleId?: string }`
- **`ServiceListItemSchema`**:
  - `id`: UUID
  - `name`: string
  - `slug`: string
  - `description`: string (nullable)
  - `serviceKey`: string
  - `escalationPolicyId`: UUID
  - `escalationPolicy`: `{ id: UUID, name: string, rules: array }`
  - `totalIncidents`: number
  - `activeIncidents`: number
  - `status`: `'HEALTHY' | 'CRITICAL'`
  - `createdAt`: ISO string
  - `updatedAt`: ISO string

---

## 3. Backend REST Endpoints (`apps/api`)

### Services

- `GET /api/v1/services`: List all active monitored services with linked escalation policy, incident count, and active incidents count.
- `GET /api/v1/services/:id`: Get detailed service info with recent incidents and escalation policy rule tiers.
- `POST /api/v1/services`: Create a new monitored service with auto-generated secure `serviceKey` (`inc_live_` + 32-char hex token).
- `PUT /api/v1/services/:id`: Update service name, slug, description, or linked escalation policy.
- `POST /api/v1/services/:id/rotate-key`: Generate and assign a new `serviceKey` to the service, invalidating the previous key.
- `DELETE /api/v1/services/:id`: Soft-delete a monitored service (blocked if open incidents exist).

### Escalation Policies

- `GET /api/v1/escalation-policies`: List all escalation policies with rules, team, and bound services.
- `GET /api/v1/escalation-policies/:id`: Get single escalation policy with rules.
- `POST /api/v1/escalation-policies`: Create a new multi-tier escalation policy.

---

## 4. Web Dashboard UI (`apps/web`)

### Services Dashboard (`/services`)

- **4-State UI Compliance**:
  - **Loading**: High-fidelity Skeleton cards with shimmer.
  - **Empty**: Empty state with `Layers` icon and "Create Monitored Service" CTA.
  - **Error**: Error card with error details and "Retry" button.
  - **Populated**: High-density grid of service cards.
- **Card Features**:
  - Service Name, Slug, Health Status badge (`HEALTHY` emerald vs `CRITICAL` pulsing beacon if active incidents > 0).
  - Linked Escalation Policy badge with multi-tier breakdown.
  - Incident statistics (Active / Total).
  - Masked Service Key with Reveal / Copy to Clipboard.
  - **Rotate Key** action with confirmation modal.
  - **Test Alert** trigger runner with customizable payload and 1-click execution.
  - **Integration Snippets** drawer: copyable cURL, Prometheus webhook, Datadog webhook, and raw JSON payload formats.
- **Modals & Drawers**:
  - `CreateServiceModal`: Form with name, slug auto-generation, description, and escalation policy selector.
  - `ServiceIntegrationDrawer`: Code snippets, cURL copier, and live interactive test alert runner.
  - `RotateKeyModal`: Confirmation dialog before invalidating current service API key.

---

## 5. Quality & Verification Gates

- Strict TypeScript compilation (`npm run typecheck --workspaces`).
- ESLint & Prettier verification (`npm run lint`, `npm run format`).
- Backend integration test suite covering CRUD, key rotation, and authorization in `apps/api/src/__tests__/service.test.ts`.
- Next.js static build (`npm run build --workspace=apps/web`).
