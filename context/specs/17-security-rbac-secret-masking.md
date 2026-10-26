# Unit 17: Security Hardening, RBAC Guards & Secret Protection

---

## 1. Goal

Remediate critical security vulnerabilities and access control flaws identified in the system security audit:

1. **RBAC on Incident Mutations**: Restrict `POST /api/v1/incidents/:id/acknowledge` and `POST /api/v1/incidents/:id/resolve` to `ADMIN` and `RESPONDER` roles, preventing read-only `VIEWER` accounts from modifying incident states, canceling timers, and forging audit logs.
2. **RBAC on Schedules & Shifts**: Enforce `ADMIN`-only authorization on `POST /api/v1/schedules`, `POST /api/v1/schedules/:id/shifts`, and `DELETE /api/v1/schedules/:id/shifts/:shiftId`.
3. **Service API Key Masking & Protection**: Mask `serviceKey` in `GET /api/v1/services` and `GET /api/v1/services/:id` for non-admin callers (e.g., `inc_live_••••••••3a8b`). Ensure only full `ADMIN` roles or key rotation/creation responses receive plaintext secrets.
4. **Header-First Service Webhook Ingestion (CWE-598 Remediation)**: Prioritize `Authorization: Bearer <serviceKey>` and `x-service-key` headers over URL path parameters (`/services/:serviceKey`), preventing sensitive integration secrets from leaking into access logs, reverse proxies, and error payloads.
5. **API Rate Limiting Middleware**: Implement rate limiting on public authentication routes (`/api/v1/auth/login`) and webhook ingestion routes (`/api/v1/webhooks`) to mitigate brute-force attacks and alert flood denial-of-service.

---

## 2. Technical Design & Architecture

### A. RBAC Enforcement Points

| Endpoint                                | Method   | Required Roles       | Middleware Chain                                                                                                  |
| :-------------------------------------- | :------- | :------------------- | :---------------------------------------------------------------------------------------------------------------- |
| `/api/v1/incidents/:id/acknowledge`     | `POST`   | `ADMIN`, `RESPONDER` | `authenticateJwt`, `requireRole([UserRole.ADMIN, UserRole.RESPONDER])`, `validateBody(AcknowledgeIncidentSchema)` |
| `/api/v1/incidents/:id/resolve`         | `POST`   | `ADMIN`, `RESPONDER` | `authenticateJwt`, `requireRole([UserRole.ADMIN, UserRole.RESPONDER])`, `validateBody(ResolveIncidentSchema)`     |
| `/api/v1/schedules`                     | `POST`   | `ADMIN`              | `authenticateJwt`, `requireRole([UserRole.ADMIN])`, `validateBody(CreateScheduleSchema)`                          |
| `/api/v1/schedules/:id/shifts`          | `POST`   | `ADMIN`              | `authenticateJwt`, `requireRole([UserRole.ADMIN])`, `validateBody(CreateShiftSchema)`                             |
| `/api/v1/schedules/:id/shifts/:shiftId` | `DELETE` | `ADMIN`              | `authenticateJwt`, `requireRole([UserRole.ADMIN])`                                                                |

### B. Service Secret Masking Logic

In `ServiceService`:

- Helper: `maskServiceKey(key: string): string`
  - Input: `inc_live_abcdef1234567890abcdef1234567890`
  - Output: `inc_live_••••••••7890` (preserves prefix and last 4 characters).
- When `listServices` or `getServiceById` is executed:
  - If caller is `UserRole.ADMIN`, return unmasked key.
  - If caller is `UserRole.RESPONDER` or `UserRole.VIEWER`, return masked key.
- Key rotation (`POST /services/:id/rotate-key`) and creation (`POST /services`) return the newly generated plaintext key once to the administering user.

### C. Rate Limiting Middleware

- `/api/v1/auth/login`: Maximum 15 requests per 1-minute window per IP.
- `/api/v1/webhooks`: Maximum 120 requests per 1-minute window per IP/key.
- Implemented with clean error response matching standard `AppError` format (`statusCode: 429`, `message: "Too many requests. Please try again later."`).

---

## 3. Verification & Quality Gates

1. **Automated Integration Tests**:
   - `auth.test.ts`: Verify `VIEWER` receives `403 Forbidden` on `/acknowledge` and `/resolve`.
   - `schedule.test.ts`: Verify `RESPONDER` and `VIEWER` receive `403 Forbidden` on schedule creation and shift deletion.
   - `service.test.ts`: Verify `serviceKey` is masked for `VIEWER` and unmasked for `ADMIN`.
2. **Typecheck & Linters**:
   - `npm run typecheck` across all workspaces.
   - `npm run lint` with 0 warnings.
   - `npm run format:check` with Prettier.
