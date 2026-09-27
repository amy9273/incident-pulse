# Unit 14: Automated Testing & CI/CD Pipeline

---

## 1. Goal

Consolidate and harden the end-to-end continuous integration and automated testing pipeline across all monorepo workspaces (`apps/api`, `apps/web`, `apps/mobile`, `packages/shared`) in `.github/workflows/ci.yml`:

1. **Monorepo-Wide Static Analysis & Code Style Quality Gate**:
   - Prettier formatting check across all code, markdown, and config files (`format:check`).
   - Strict ESLint checks across TypeScript workspaces (`@incident-pulse/api`, `@incident-pulse/web`, `@incident-pulse/shared`).
   - Zero-warning TypeScript compilation (`npm run typecheck --workspaces`).

2. **Automated Backend Integration Test Runner**:
   - Containerized PostgreSQL 16 and Redis 7 background services in GitHub Actions runner.
   - Dynamic schema migration (`prisma db push --skip-generate`).
   - Full automated test suite execution (70 integration tests across 31 test suites in `apps/api`) verifying auth, deduplication, escalation state machine, triage endpoints, schedules, services, and WebSockets.

3. **Production Web Application Build Verification**:
   - Next.js 14 App Router production bundle compilation (`next build`).
   - Verification of 10 static prerendered routes with zero build or hydration errors.

4. **Production Flutter Mobile Quality Gate**:
   - Setup Java 17 and stable Flutter SDK.
   - Strict Dart formatting verification (`dart format --output=none --set-exit-if-changed .`).
   - Flutter static analysis with zero lint warnings (`flutter analyze`).
   - Headless unit & widget test execution (`flutter test`) verifying all 18 mobile tests including SQLite cache, transactional outbox pattern, push alert parser, and emergency triage UI.
   - Removal of legacy `continue-on-error` bypasses now that Phase 3 is complete.

5. **Unified Branch Protection Gate (`ci-success`)**:
   - An aggregation job that depends on all matrix jobs and acts as the required check for GitHub Pull Requests.

---

## 2. CI/CD Architecture

```
GitHub Push / PR
       │
       ├──► Job 1: Lint & Typecheck (Node 20, Prettier, ESLint, TypeScript)
       ├──► Job 2: Backend Tests (PostgreSQL 16, Redis 7, Prisma, 70 API Tests)
       ├──► Job 3: Web Build (Next.js 14 Production Static Optimization)
       └──► Job 4: Mobile Quality Gate (Java 17, Flutter Stable, Analyze, 18 Tests)
                 │
                 ▼
       Job 5: CI Success Aggregator (Branch Protection Gate)
```

---

## 3. Verification & Acceptance Criteria

- [ ] All 4 quality jobs run in parallel on GitHub Actions runners.
- [ ] Mobile job strictly enforces `dart format`, `flutter analyze`, and `flutter test` without `continue-on-error`.
- [ ] Root `package.json` contains unified test scripts (`npm run test:api`, `npm run test:mobile`).
- [ ] All local checks pass (`npm run format:check`, `npm run typecheck`, `npm run lint`, `flutter test`, `flutter analyze`).
- [ ] Working tree is clean and committed to `feat/unit-14-automated-testing-ci-cd`.
