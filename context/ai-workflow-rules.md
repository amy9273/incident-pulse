# AI Workflow Rules — IncidentPulse

These rules govern how AI coding agents must operate while building and modifying IncidentPulse. They are imperative rules, not suggestions.

---

## 1. Spec-Driven Discipline

- **Never code without a spec**: Before writing or modifying any implementation code, read the active unit spec in `context/specs/NN-[feature-name].md`.
- **Stay in scope**: Implement only what the spec demands. Do not add speculative "nice-to-have" features or install unapproved packages.
- **Consult invariants**: Check every change against `context/architecture.md` invariants before concluding a unit.

---

## 2. UI Consistency Enforcement (Anti-Slop Guardrail)

- **Zero Arbitrary Values**: Never write inline styles (`style={{ ... }}`), raw hex codes (`bg-[#123456]`), or ad-hoc Flutter `Color(0x...)`. All colors, margins, and typography must use tokens from `context/ui-context.md`.
- **Mandatory 4-State UI**: Any view fetching or mutating data must explicitly build all four states:
  1. Content-shaped Skeleton loading state (never an unstyled solitary spinner).
  2. Meaningful Empty state with an actionable button.
  3. User-friendly Error state with a "Retry" button.
  4. Populated data view.
- **Cross-Platform Semantic Match**: An incident in `TRIGGERED` status must be visually and ergonomically identical in meaning on both Next.js and Flutter (pulsing indicator, high-contrast critical styling).

---

## 3. Scoping & Execution Discipline

- **Always Sync Upstream First**: Before starting any new unit or creating a feature branch, pull the latest changes from the primary branch (`git pull origin main` or `git checkout main; git pull origin main`) to ensure your baseline is up-to-date.
- **One Unit at a Time**: Work on a single, isolated unit per prompt cycle. Complete and verify it before moving to the next.
- **Explicit Consent Before Proceeding**: Never automatically proceed to the next unit without explicit user consent. Always complete, test, and present the current unit's deliverables, and wait for the user to instruct or approve moving to the next unit.
- **Build Artifact Hygiene & Merge Conflict Prevention**: Never commit temporary compiler cache files (`*.tsbuildinfo`), build outputs (`.next/`, `dist/`), or local runtime files. Always keep `.gitignore` updated. Before pushing, merge `origin/main` to proactively resolve any registry conflicts and ensure 0 merge conflicts.
- **Never commit to `main` or `master`**: AI agents must **NEVER** commit or push directly to `main` or `master`. Always verify that work is isolated to a feature branch (`feat/unit-NN-description`).
- **Never bypass errors**: If a TypeScript or compilation error occurs, fix the root cause. Never cast to `any` or suppress linter errors with `@ts-ignore`.
- **Keep Documentation in Sync**:
  - Update `context/progress-tracker.md` when starting and finishing a unit.
  - If a design or technical decision evolves during implementation, update `architecture.md` or `project-overview.md` immediately.

---

## 4. Proactive IDE & Type Error Prevention Protocol

AI agents must proactively follow these architectural rules to prevent IDE language server and TypeScript resolution errors:

1. **Zero Circular Dependencies**:
   - Never create circular imports between `workers/`, `services/`, and `controllers/`.
   - Always place shared queues, instances, and configurations in dedicated leaf modules in `src/lib/` (e.g. `src/lib/queue.ts`, `src/lib/prisma.ts`, `src/lib/redis.ts`).
2. **Prisma Type Isolation & Clean JSON Handling**:
   - Never rely on unstable or unexported internal Prisma namespace types (e.g., `Prisma.JsonValue`, `Prisma.InputJsonValue`, `Prisma.InputJsonObject`, `Prisma.DbNull`).
   - Use clean, standard TypeScript types (`Record<string, unknown>`, `unknown`, or concrete DTO interfaces) for JSON columns.
   - Always explicitly type transaction parameters: `(tx: Prisma.TransactionClient) => ...`.
3. **Explicit Callback & Lambda Parameter Typing**:
   - Always provide explicit parameter types for all `.map()`, `.filter()`, `.find()`, and array callbacks (e.g., `(inc: IncidentWithRelations) => ...`, `(log: IncidentLogEntry) => ...`) to prevent `noImplicitAny` IDE errors.
4. **Mandatory Automated Code Quality & Style Verification Loop**:
   - **Formatting (Prettier)**: Run `npx prettier --check "apps/**/*.{ts,tsx,js,json,md}"` (or `npm run format` / `npx prettier --write ...` to fix) on every iteration. Zero style warnings permitted.
   - **Strict Typecheck**: Run `npm run typecheck --workspaces` (`tsc --noEmit`) across all workspaces. Zero compiler errors permitted.
   - **Linting**: Run `npm run lint --workspaces` (`eslint .`). Zero linter warnings/errors permitted.
   - **Test Suites**: Run relevant unit/integration tests to ensure regressions are caught early.

---

## 5. Background Task & Process Lifecycle Management

- **No Orphaned Background Tasks**: When executing tests, dev servers, or long-running scripts, actively track all background task IDs.
- **Mandatory Kill on Completion/Teardown**: If a task finishes its job, times out, hangs, or is superseded, immediately terminate it via `manage_task(Action='kill')` to prevent memory leaks, open database/Redis socket leaks, or orphaned Node processes.
- **Active Verification**: Before ending any turn or concluding a unit, inspect running background tasks (`manage_task(Action='list')`) and kill any non-daemon processes that should not be lingering.

---

## 6. Quality Gate & CI/CD Verification Before Closing

Before marking any unit complete in `context/progress-tracker.md`, run and verify:

- [ ] Working on a feature branch (`feat/unit-NN-...`), NEVER directly on `main` or `master`.
- [ ] Prettier formatting check passes (`npx prettier --check "apps/**/*.{ts,tsx,js,json,md}"`).
- [ ] TypeScript compilation passes with zero errors (`npm run typecheck --workspaces`).
- [ ] Linter passes with zero warnings (`npm run lint --workspaces`).
- [ ] Unit/Integration tests pass cleanly with all handles and background tasks terminated.
- [ ] Component meets the 4-state UI rule and uses tokens from `ui-context.md`.
- [ ] Clean diff verified (`git diff` has no leftover `console.log`, debugger, or commented-out code).
- [ ] No hardcoded secrets, API keys, or localhost URLs committed.
- [ ] Zero lingering background tasks (`manage_task(Action='list')` is clean).

---

## 7. Handling Missing or Ambiguous Requirements

If an edge case or requirement is not defined in the spec:

1. Check `project-overview.md` and `architecture.md` to see if existing rules cover it.
2. If still ambiguous, **pause and ask the developer** before guessing.
3. Record the resolved decision in the `Architecture Decisions` section of `context/progress-tracker.md`.
