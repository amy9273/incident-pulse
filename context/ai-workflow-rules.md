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
- **One Unit at a Time**: Work on a single, isolated unit per prompt cycle. Complete and verify it before moving to the next.
- **Never commit to `main` or `master`**: AI agents must **NEVER** commit or push directly to `main` or `master`. Always verify that work is isolated to a feature branch (`feat/unit-NN-description`).
- **Never bypass errors**: If a TypeScript or compilation error occurs, fix the root cause. Never cast to `any` or suppress linter errors with `@ts-ignore`.
- **Keep Documentation in Sync**:
  - Update `context/progress-tracker.md` when starting and finishing a unit.
  - If a design or technical decision evolves during implementation, update `architecture.md` or `project-overview.md` immediately.

---

## 4. Quality Gate & CI/CD Verification Before Closing
Before marking any unit complete in `context/progress-tracker.md`, run and verify:
- [ ] Working on a feature branch (`feat/unit-NN-...`), NEVER directly on `main` or `master`.
- [ ] TypeScript compilation passes with zero errors (`tsc --noEmit`).
- [ ] Linter & formatter pass with zero warnings (`eslint .`, `prettier --check .`).
- [ ] Unit/Integration tests pass against the test database.
- [ ] Component meets the 4-state UI rule and uses tokens from `ui-context.md`.
- [ ] Clean diff verified (`git diff` has no leftover `console.log`, debugger, or commented-out code).
- [ ] No hardcoded secrets, API keys, or localhost URLs committed.

---

## 5. Handling Missing or Ambiguous Requirements
If an edge case or requirement is not defined in the spec:
1. Check `project-overview.md` and `architecture.md` to see if existing rules cover it.
2. If still ambiguous, **pause and ask the developer** before guessing.
3. Record the resolved decision in the `Architecture Decisions` section of `context/progress-tracker.md`.
