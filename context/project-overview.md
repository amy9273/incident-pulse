# Project Overview — IncidentPulse

## Overview
**IncidentPulse** is an open-source, full-stack incident response and on-call alerting platform (a high-performance alternative to PagerDuty/Opsgenie). It ingests system alerts via webhooks, runs an automated escalation state machine, and routes urgent notifications to on-call engineers via real-time WebSockets and Mobile push notifications. It features an interactive on-call scheduling calendar on the web and a quick-triage responder app on mobile.

---

## Core Goals
1. **Zero-Loss Alert Ingestion**: Reliably ingest external monitoring alerts via webhook, deduplicate by incident fingerprint, and queue for processing within < 200ms.
2. **Deterministic Escalation Engine**: Run an escalation state machine using Redis delay queues. If an alert is unacknowledged within $N$ minutes, auto-escalate to the next tier.
3. **Cross-Platform Real-Time Triage**: Synchronize incident state instantly across the Next.js web dashboard (via WebSockets) and the Flutter mobile app (via Push Notifications & offline cache).
4. **Portfolio Showcase**: Demonstrate clean architecture, production-grade DevOps (Docker Compose, CI/CD), distributed systems principles, and enterprise UI ergonomics.

---

## Step-by-Step Core User Flow
1. **Integration Setup**: A team creates a Service in the Web Dashboard (e.g., "Payment Gateway") with an assigned Escalation Policy and an API Webhook Key.
2. **Alert Trigger**: A monitoring tool (or mock script) sends an HTTP POST payload to `/api/v1/webhooks/services/:serviceKey`.
3. **Ingestion & Deduplication**: The API validates the payload, checks for existing open incidents with the same fingerprint, and creates an incident with status `TRIGGERED`.
4. **Dispatch & Notification**:
   - The escalation engine checks the active on-call schedule for Tier 1.
   - A high-priority push notification is sent to the assigned engineer's Flutter mobile app.
   - The Next.js live board flashes the critical alert in real time over WebSockets.
5. **Acknowledgment**:
   - The on-call engineer taps **Acknowledge** either from the mobile push notification/app or the web dashboard.
   - Status transitions to `ACKNOWLEDGED`.
   - The escalation timeout timer is immediately cancelled.
6. **Resolution**:
   - Once the issue is resolved, the engineer marks it `RESOLVED` and enters brief root-cause notes.
   - All open timelines and metrics (MTTA: Mean Time to Acknowledge, MTTR: Mean Time to Resolve) are finalized.

---

## Features

### Alert Ingestion & Services (Backend)
- Service registry with unique integration API keys.
- Generic JSON webhook parser with field mapping (title, severity, summary, fingerprint).
- Incident deduplication (auto-grouping incoming alerts by hash/fingerprint).

### Escalation State Machine (Backend)
- Multi-tier escalation policies (e.g., Level 1 $\rightarrow$ 5 min delay $\rightarrow$ Level 2 $\rightarrow$ 10 min delay $\rightarrow$ Team Lead).
- Redis-backed delay queue (BullMQ) for reliable timer handling across server restarts.
- Auto-escalation, manual escalation, and notification audit logs.

### Web Dashboard (Next.js)
- **Live Incident Board**: Real-time status feed (`TRIGGERED`, `ACKNOWLEDGED`, `RESOLVED`) with live WebSocket updates.
- **On-Call Schedule Builder**: Interactive visual calendar to manage weekly shift rotations (who is on-call today and upcoming).
- **Service & Integration Manager**: UI to generate webhook tokens and inspect incoming raw payloads.
- **Analytics & Post-Mortem**: Metrics for MTTA, MTTR, and incident breakdown by service.

### Mobile Responder App (Flutter)
- **Urgent Alert Screen**: High-contrast, action-oriented UI with prominent "Acknowledge" and "Resolve" triggers.
- **Push Notification Handling**: Deep links directly to the incident triage view.
- **Offline Incident Cache**: Caches recent incidents locally with SQLite so responders can view details without cell reception.
- **On-Call Schedule View**: Mobile view showing current shift status and upcoming rotations.

---

## Scope Boundaries

### In-Scope (MVP)
- Email and Push notifications (using mock / Firebase Cloud Messaging).
- Webhook alert ingestion with deduplication.
- Escalation policies with up to 3 tiers and customizable timeout delays.
- Real-time WebSocket sync between API, Web, and Mobile.
- Single-organization multi-team data model with JWT auth.
- Docker Compose setup for local development (PostgreSQL, Redis, API, Web).

### Out-of-Scope (Non-Goals for Initial Build)
- Twilio SMS / phone call voice dialing (costly and third-party dependent; mocked if needed).
- Complex enterprise SSO / SAML (standard email/password JWT is sufficient for portfolio).
- Multi-region database replication.
- AI automated root-cause remediation (keep focus on rock-solid core engineering).

---

## Success Criteria
- [ ] An alert posted via `curl` triggers a visible live update on the Web Dashboard in < 500ms.
- [ ] The Flutter app receives the notification and can acknowledge it in one tap.
- [ ] If unacknowledged for 60 seconds (in test mode), the backend automatically triggers the Tier 2 escalation target.
- [ ] `docker compose up` spins up the entire backend, Postgres, Redis, and Web app cleanly.
