# osrs-tracker-web

Angular 22 SSR app (zoneless, signals, standalone) on a custom Express server (`src/server/`), deployed to Kubernetes at
https://osrs-tracker.freekmencke.com. Sibling repos: `../osrs-tracker-api`, `../osrs-tracker-aws`.

**Load the `osrs-tracker-web` skill before writing, reviewing, running, deploying or committing anything here.** It
holds the Angular conventions, SSR rules, deploy and release steps. Keep detail there, not in this file.

## Commands

- Verify: `npx ng build --configuration production && npx ng lint && npm run prettier:ci && npx ng test --watch=false`
- One spec: `npx ng test --watch=false --include <path>`
- Dev server: `npm start`, always on port 4200 (the API's CORS allows only that).

## Hard rules

- Every change gets a user-facing `CHANGELOG.md` entry under today's `## YYYY/MM/DD`.
- Doc-only changes go straight to `main`; for anything else, ask: `main` or a PR (unless releasing).
- Never `--no-gpg-sign`, never `'unsafe-inline'` in the CSP, never write to disk at runtime (read-only root filesystem).
- Read `docs/decisions.md` before "fixing" something that looks odd; many trade-offs are deliberate.

## Where things live

- `src/app/features/<feature>/` single-feature code; `src/app/common/` shared code, HTTP only via
  `common/repositories/`.
- `src/app/core/` app-wide plumbing: interceptors, routing (reuse strategy, resolver errors), platform (`WINDOW`,
  `isHumanVisitor`).
- `docs/decisions.md` trade-offs, `docs/runbook.md` rollback and failure modes.
- `.claude/agents/conventions-reviewer.md` reviews diffs against the skill and this file.
