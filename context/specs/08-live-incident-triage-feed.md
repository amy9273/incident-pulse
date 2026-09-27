# Unit 08: Live Incident Triage Feed (Next.js + TanStack Query + WebSockets)

---

## 1. Goal

Implement the real-time incident triage board and live incident detail inspection workflow in `apps/web`:

1. **WebSocket Real-Time Hook & Cache Sync (`useSocket`)**:
   - Connect to backend Socket.io server with JWT authentication handshake.
   - Maintain connection health state for `LiveStatusIndicator` (`Connected (Live)` vs `Connecting...` / `Offline`).
   - Automatically handle real-time WebSocket events (`incident:created`, `incident:updated`, `incident:escalated`) and update the TanStack Query cache without requiring page refreshes.
2. **TanStack Query Hooks (`useIncidents`, `useIncident`, `useAcknowledgeIncident`, `useResolveIncident`, `useTriggerTestAlert`)**:
   - Fetch query with filter support (`status`, `urgency`, `serviceId`, `search`).
   - Optimistic updates for 1-click Acknowledge and Resolve actions with immediate UI feedback and rollback on error.
   - Single incident query with full audit timeline logs and raw webhook payload inspection.
3. **Interactive Incident Triage Board**:
   - Status filters (`ALL`, `TRIGGERED`, `ACKNOWLEDGED`, `RESOLVED`) and search filter.
   - High-density incident items displaying status badges with live pulsing beacons, escalation tier step, service, assignee, and deduplication alert counts.
   - 1-Click action triggers: **Acknowledge** (transitions `TRIGGERED` $\rightarrow$ `ACKNOWLEDGED`, halts timers) and **Resolve** (transitions to `RESOLVED`).
   - Mandatory 4-state UI handling (Skeleton loaders, Empty states, Error state with retry, Populated view).
4. **Incident Detail Inspection Drawer**:
   - Slide-over drawer displaying full incident details, fingerprint hash, assigned service, linked escalation policy, and raw JSON webhook payload.
   - Immutable audit log timeline (`IncidentLogAction`: `TRIGGERED`, `ACKNOWLEDGED`, `RESOLVED`, `ESCALATED`, `REASSIGNED`).
5. **Interactive Quick Test Alert Trigger**:
   - Built-in simulation trigger allowing operators to simulate monitored webhook alerts and watch them pop up on screen in real time in < 500ms.

---

## 2. Architecture & File Structure

```
apps/web/src/
├── hooks/
│   ├── useSocket.ts             # Socket.io connection hook & query cache mutator
│   └── useIncidents.ts          # TanStack queries & mutation hooks
├── components/
│   └── incidents/
│       ├── IncidentRow.tsx       # High-density incident item with 1-click triage buttons
│       ├── IncidentDetailDrawer.tsx # Slide-over drawer with payload & audit trail
│       ├── TriggerAlertModal.tsx # Quick alert simulation modal
│       └── IncidentStatsCards.tsx # Live KPI metric overview
└── app/(dashboard)/incidents/
    └── page.tsx                 # Live incident feed connected to real-time API
```

---

## 3. Verification Checklist

- [ ] Socket.io client connects with JWT handshake and automatically subscribes to `incidents:global`.
- [ ] Ingesting an alert via API/webhook emits `incident:created` and immediately prepends the incident to the web UI in real time without refreshing.
- [ ] Clicking **Acknowledge** triggers optimistic UI update and API call to `/api/v1/incidents/:id/acknowledge`.
- [ ] Clicking **Resolve** transitions incident to `RESOLVED`.
- [ ] Incident drawer opens and displays the full audit history timeline and raw payload.
- [ ] 4-State UI (Loading, Empty, Error, Populated) works cleanly.
- [ ] `npm run typecheck --workspaces` passes with 0 errors.
- [ ] `npm run lint` passes with 0 warnings.
- [ ] `npm run build --workspace=apps/web` passes with 0 errors.
