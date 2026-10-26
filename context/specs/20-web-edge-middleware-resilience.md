# Unit 20: Web Edge Middleware, Real-Time Reconnection & Operational Guardrails

---

## 1. Goal

Remediate web perimeter routing vulnerabilities, client reconnection stale state, and operational hazards identified in the engineering audit:

1. **Next.js Edge Middleware (`middleware.ts`) for Route Protection (DEF Finding 6.2)**:
   - Enforce server-side route boundary checks at the edge runtime before static prerendered HTML or layout shells are served to clients.
   - Redirect unauthenticated requests to `/login?returnUrl=...`.
   - Redirect authenticated users visiting `/login` directly to dashboard `/`.
   - Allow static assets, images, and API paths to bypass middleware.

2. **Socket.io Client Reconnection Cache Invalidation (DEF Finding 6.3 & Reliability Gap #3)**:
   - When the web client reconnects after network dropouts, sleep mode, or socket disconnects, automatically invalidate TanStack Query caches (`incidents`, `schedules`, `services`, `incident`) to prevent stale UI state.

3. **Database Seeding Operational Safety Guardrail (DEF-17)**:
   - Guard `seed()` against accidental data destruction (`deleteMany()`) on remote or hosted databases (e.g. AWS Neon, Supabase, RDS) and in production environments.
   - Require explicit authorization (`ALLOW_SEED_RESET=true` or `{ force: true }`) to wipe data on remote or production environments.

4. **CLI Simulation Standalone Escalation Worker & Safety Checks (DEF Finding 8.2)**:
   - When running standalone simulation without an external API server running, instantiate and start `createEscalationWorker()` to genuinely process delayed BullMQ escalation jobs.
   - Guard standalone simulation against executing synthetic alert mutations on remote databases without `--force` or `ALLOW_SIMULATION=true`.
   - Ensure clean shutdown (`worker.close()`, `server.close()`, `queue.close()`, `prisma.$disconnect()`, `redis.disconnect()`).

---

## 2. Technical Design & Architecture

### A. Next.js Edge Middleware (`apps/web/src/middleware.ts`)

```typescript
export function middleware(request: NextRequest) {
  const token = request.cookies.get("incident_pulse_token")?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith("/login");
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico";

  if (isPublicAsset) return NextResponse.next();

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!token && !isAuthPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
```

### B. Socket.io Client Automatic Cache Invalidation (`apps/web/src/context/SocketContext.tsx`)

```typescript
newSocket.on("connect", () => {
  setIsConnected(true);
  queryClient.invalidateQueries({ queryKey: ["incidents"] });
  queryClient.invalidateQueries({ queryKey: ["schedules"] });
  queryClient.invalidateQueries({ queryKey: ["services"] });
});

newSocket.io.on("reconnect", () => {
  setIsConnected(true);
  queryClient.invalidateQueries({ queryKey: ["incidents"] });
  queryClient.invalidateQueries({ queryKey: ["schedules"] });
  queryClient.invalidateQueries({ queryKey: ["services"] });
  queryClient.invalidateQueries({ queryKey: ["incident"] });
});
```

### C. Database Seeding Operational Guardrail (`apps/api/src/seeds/seed.ts`)

```typescript
export function isRemoteDatabase(urlStr?: string): boolean {
  if (!urlStr) return false;
  try {
    const hostname = new URL(urlStr).hostname.toLowerCase();
    const localHosts = ["localhost", "127.0.0.1", "::1", "0.0.0.0", "postgres", "db", "host.docker.internal"];
    return !localHosts.includes(hostname);
  } catch {
    return false;
  }
}

export async function seed(options: SeedOptions = {}) {
  const { force = false, clean = true } = options;
  const dbUrl = process.env.DATABASE_URL;
  const isRemote = isRemoteDatabase(dbUrl);
  const isProd = process.env.NODE_ENV === "production";
  const allowReset = process.env.ALLOW_SEED_RESET === "true" || force;

  if (clean && (isProd || isRemote) && !allowReset) {
    throw new Error("[Operational Safety Guardrail] Refusing to execute destructive database reset (deleteMany) on remote database...");
  }
  // ...
}
```

### D. CLI Simulation Worker Execution & Guardrail (`scripts/simulate-incident.ts`)

- Checks `isRemoteDatabase(process.env.DATABASE_URL)` before running simulation.
- Starts `createEscalationWorker()` when launching ephemeral simulation server on port 5055.
- Teardown gracefully closes `escalationWorker` and all resources.

---

## 3. Verification & Quality Gates

1. **Automated Test Suite**:
   - `apps/api/src/__tests__/unit20-operational-guardrails.test.ts`:
     - Verifies `isRemoteDatabase` correctly identifies local vs remote hosts.
     - Verifies `seed()` throws on remote DB without `ALLOW_SEED_RESET=true`.
     - Verifies `seed()` throws in production environment without authorization.
     - Verifies `seed()` allows execution when `ALLOW_SEED_RESET=true` or `{ force: true }`.
     - Verifies `createEscalationWorker` instantiates worker with graceful `.close()`.
2. **Quality Check Loop**:
   - `npm run typecheck --workspaces` (0 errors across `@incident-pulse/api`, `@incident-pulse/web`, `@incident-pulse/shared`).
   - `npm run lint` (0 errors, 0 warnings).
   - `npm run format:check` (Prettier code style).
   - `npm run build --workspace=apps/web` (Generates 10/10 static pages + Edge Middleware `ƒ Middleware 26.6 kB`).
   - `flutter test` in `apps/mobile` (25/25 tests passing).
