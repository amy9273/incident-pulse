# Unit 01: Monorepo Foundation, Environment Configuration & API Skeleton

---

## 1. Goal
Initialize the IncidentPulse monorepo root with npm workspaces (`apps/*`, `packages/*`), create container orchestration (`docker-compose.yml`) for local/CI environments, establish strict environment validation via Zod, and build the initial Express + TypeScript backend skeleton in `apps/api` featuring isolated `/health/live` and `/health/ready` probe endpoints verified against Neon PostgreSQL and Redis Cloud.

---

## 2. Design & Architecture
- **Monorepo Layout**: Root `package.json` managing `apps/api`, `apps/web`, `apps/mobile`, and `packages/shared`.
- **Config & Typing**: Root `tsconfig.base.json` shared by all TypeScript projects with `strict: true`.
- **Environment Schema**: `apps/api/src/config/env.ts` parsing environment variables through Zod at server boot.
- **Probe Separation (Invariant #6)**:
  - `GET /health/live`: Returns `200 OK` ($< 1\text{ms}$) verifying process responsiveness without touching external databases.
  - `GET /health/ready`: Pings Neon PostgreSQL (`SELECT 1`) and Redis Cloud (`PING`). Returns `200 OK` with latency metrics if both are healthy, or `503 Service Unavailable` if either is down.

---

## 3. Implementation Details

### A. Root Monorepo
- `package.json`: Configure npm workspaces, scripts (`dev:api`, `build:api`, `lint`, `typecheck`).
- `tsconfig.base.json`: Base compiler options (ES2022, NodeNext / Bundler module resolution, strict).
- `docker-compose.yml`: PostgreSQL 16 Alpine + Redis 7 Alpine with volume persistence and health checks.
- `.env.example`: Template for local and CI environments.
- `.env`: Real credentials for Neon PostgreSQL and Redis Cloud (gitignored).

### B. Backend Skeleton (`apps/api`)
- `apps/api/package.json`:
  - Dependencies: `express`, `dotenv`, `zod`, `cors`, `helmet`, `pino`, `pino-pretty`, `ioredis`, `@prisma/client`.
  - DevDependencies: `typescript`, `@types/node`, `@types/express`, `@types/cors`, `tsx`.
- `apps/api/src/config/env.ts`: Zod schema validating `PORT`, `NODE_ENV`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`.
- `apps/api/src/lib/redis.ts`: Singleton Redis client configured with reconnection logic.
- `apps/api/src/routes/health.routes.ts`: Endpoints for `/health/live` and `/health/ready`.
- `apps/api/src/app.ts` & `src/index.ts`: Express application bootstrap and graceful shutdown handler.

---

## 4. Dependencies to Install
- `express`, `cors`, `helmet`, `dotenv`, `zod`, `pino`, `pino-pretty`, `ioredis`
- `typescript`, `tsx`, `@types/express`, `@types/node`, `@types/cors`

---

## 5. Verification Checklist
- [ ] Monorepo `npm install` completes cleanly with zero errors.
- [ ] `apps/api/src/config/env.ts` successfully parses valid configuration.
- [ ] `GET /health/live` returns HTTP 200 with `{ status: "alive" }`.
- [ ] `GET /health/ready` connects to Neon PostgreSQL and Redis Cloud, returning HTTP 200 with `{ status: "ready", checks: { database: "healthy", redis: "healthy" } }`.
- [ ] TypeScript compilation (`npm run typecheck --workspace=apps/api`) passes with 0 errors.
- [ ] Git status confirms `.env` is ignored and working tree is ready for atomic commit.
