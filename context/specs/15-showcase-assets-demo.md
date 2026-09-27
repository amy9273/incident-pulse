# Unit 15: Showcase Assets & Interactive Demo Script

---

## 1. Goal

Deliver the final production polish, developer documentation, and interactive demonstration assets for the IncidentPulse monorepo to enable any engineering leader or hiring manager to evaluate the entire end-to-end architecture in under 60 seconds:

1. **Interactive Demo Simulation Script (`npm run simulate:incident`)**:
   - An automated CLI simulation script (`scripts/simulate-incident.ts`) demonstrating the full lifecycle of an incident:
     - Health check probe verification (`/health/ready`).
     - Alert ingestion via monitored service webhook key (`POST /api/v1/webhooks/services/:key`).
     - SHA-256 deterministic fingerprint deduplication (Invariant #2).
     - Automated escalation state machine queuing in Redis BullMQ.
     - Real-time multi-client dispatch (WebSocket & Push notification events).
     - 1-tap mobile triage acknowledgment (`POST /api/v1/incidents/:id/acknowledge`) with timer cancellation (Invariant #1).
     - Incident resolution (`POST /api/v1/incidents/:id/resolve`) with MTTA/MTTR calculation and audit log finalization.
   - Vibrant terminal UI with colorized steps, ASCII banners, performance metrics, and formatted JSON payloads.

2. **OpenAPI 3.0 Specification & Interactive Swagger UI**:
   - OpenAPI 3.0 specification covering all REST endpoints (`/api/v1/docs/openapi.json`).
   - Self-contained interactive Swagger UI rendered at `/api/v1/docs` with dark mode ergonomics matching `ui-context.md`.

3. **Production Portfolio Master README**:
   - Root `README.md` featuring architecture badges, Mermaid sequence and component diagrams, distributed systems invariants, quick start guide, API explorer, and test matrix.

---

## 2. Deliverables

- `context/specs/15-showcase-assets-demo.md`: Unit specification.
- `apps/api/src/routes/docs.routes.ts`: OpenAPI 3.0 JSON spec and Swagger UI HTML renderer.
- `apps/api/src/app.ts`: Mount `/api/v1/docs` route.
- `scripts/simulate-incident.ts`: Interactive end-to-end incident lifecycle simulation script.
- `package.json`: Add `"simulate:incident": "tsx scripts/simulate-incident.ts"` root command.
- `README.md`: Comprehensive portfolio presentation.
- `context/progress-tracker.md`: Updated progress tracker marking Phase 4 and Unit 15 complete.

---

## 3. Verification & Acceptance Criteria

- [ ] `npm run simulate:incident` runs successfully, executing the full 7-step incident lifecycle walkthrough.
- [ ] `GET /api/v1/docs` serves interactive Swagger UI with 200 OK.
- [ ] `GET /api/v1/docs/openapi.json` returns valid OpenAPI 3.0 schema.
- [ ] Root `README.md` contains Mermaid diagrams, invariants table, and 60-second evaluation instructions.
- [ ] All quality checks pass (`npm run format:check`, `npm run typecheck`, `npm run lint`, `flutter test`, `flutter analyze`).
