# Application Building Context — IncidentPulse

Read the following files in order before implementing or making any architectural decision:

1. `context/project-overview.md` — Product definition, core user flows, feature scope, and success criteria.
2. `context/architecture.md` — System structure, boundaries (API, Web, Mobile), storage model, and invariants.
3. `context/engineering-best-practices.md` — Master coding, architecture, security, performance, CRUD, and database best practices.
4. `context/ui-context.md` — Theme, status colors, ergonomics, and anti-slop consistency rules for Web and Mobile.
5. `context/code-standards.md` — Implementation rules for Node/Express (TypeScript), Next.js, and Flutter (Dart) + CI/CD quality gates.
6. `context/ai-workflow-rules.md` — Development workflow, spec adherence, and verification rules.
7. `context/progress-tracker.md` — Current phase, completed work, open questions, and next steps.

---

### Operating Rules

- **Sync Upstream First (Mandatory Baseline)**: Before starting any new unit or creating a feature branch, ALWAYS switch to `main`, run `git fetch origin main && git pull origin main`, and verify local `main` matches `origin/main`. Always branch directly from updated `main` (`git checkout -b feat/unit-NN-... origin/main`). NEVER branch off an unmerged or pre-squash feature branch.
- **Pre-Push Upstream Sync & Rebase**: Before pushing ANY branch, always run `git fetch origin main`. If `origin/main` has advanced (e.g. after a squash-and-merge of a prior PR), rebase your feature branch cleanly onto `origin/main` (`git rebase origin/main` or `git rebase --onto origin/main <base> <branch>`), verify `git diff --stat origin/main` reflects only current unit changes, and ensure 0 merge conflicts exist before pushing.
- Update `context/progress-tracker.md` after each meaningful implementation change.
- Work strictly against the current unit spec in `context/specs/`.
- Never violate the architectural invariants documented in `context/architecture.md` or best practices in `context/engineering-best-practices.md`.
- **Mandatory Quality Check Loop**: Run Prettier check (`npm run format:check` or `npx prettier --check "apps/**/*.{ts,tsx,js,json,md}"`), typecheck (`npm run typecheck --workspaces`), and lint before creating commits.
- **Process & Task Lifecycle**: Never leave background tasks hanging or accumulating; immediately terminate/kill finished or orphaned background tasks (`manage_task(Action='kill')`).
- **Explicit Consent for Next Unit**: Never automatically proceed to the next unit without explicit user consent. Always complete and verify the current unit, present the deliverables, and wait for the user's confirmation before starting the next unit.
- **Build Artifact Hygiene & Merge Conflict Prevention**: Never commit build caches or generated compiler info (`*.tsbuildinfo`, `.next/`, `dist/`). Always sync with `origin/main`, resolve merge conflicts by preserving all units' exports, and verify 0 conflicts before pushing.
