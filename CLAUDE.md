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

- Update `context/progress-tracker.md` after each meaningful implementation change.
- Work strictly against the current unit spec in `context/specs/`.
- If implementation changes architecture, scope, or standards, update the relevant context file before continuing.
- Never violate the architectural invariants documented in `context/architecture.md` or best practices in `context/engineering-best-practices.md`.
