# osrs-tracker-web

Angular 22 SSR app (zoneless, signals, standalone) on a custom Express server (`src/server/`), deployed to Kubernetes at
https://osrs-tracker.freekmencke.com. Sibling repos: `../osrs-tracker-api`, `../osrs-tracker-aws`.

**Load the `osrs-tracker-web` skill before writing, reviewing, running, deploying or committing anything here.** It
holds the Angular conventions, SSR rules, deploy and release steps. Keep detail there, not in this file.

## Commands

- Verify: `npx ng build --configuration production && npx ng lint && npm run prettier:ci && npx ng test --watch=false`
- One spec: `npx ng test --watch=false --include <path>`
- Dev server: `npm start`, always on port 4200 (the API's CORS allows only that).
- Worktrees in `.claude/worktrees/` use the main checkout's `node_modules` (found in a parent folder); run `npm ci` in
  one only when its `package.json` changes. Other sessions share port 4200: check `ss -ltn | grep :4200` before
  `npm start`, and stop it when done. A session edits only its own worktree; Claude Code blocks writes into another one.
- Pushes run `.claude/hooks/pre-push-check.sh` first (lint and Prettier on the checkout being pushed).

## Hard rules

- Every change gets a user-facing `CHANGELOG.md` entry under today's `## YYYY/MM/DD`. Parallel PRs all add that heading:
  when merging one after another, rebase and fold the entries under one heading.
- Doc-only changes go straight to `main`; for anything else, ask: `main` or a PR (unless releasing).
- Deploying is merging to `main` (GitHub Actions `CD` → Flux). Never build, push or `kubectl apply` by hand.
- Never `--no-gpg-sign`, never `'unsafe-inline'` in the CSP, never write to disk at runtime (read-only root filesystem).
- Read `docs/decisions.md` before "fixing" something that looks odd; many trade-offs are deliberate.

## Where things live

- `src/app/features/<feature>/` single-feature code; `src/app/common/` shared code, HTTP only via
  `common/repositories/`.
- `src/app/core/` app-wide plumbing: interceptors (API base URL), routing (reuse strategy, resolver errors), platform
  (`WINDOW`, `isHumanVisitor`).
- `src/server/` the Express server: middleware (CSP nonce, request logging, missing assets, page cache), the
  auto-generator that pre-renders pages, `server-config.ts` (env vars).
- `docs/decisions.md` trade-offs, `docs/runbook.md` rollback and failure modes.
- `.claude/agents/conventions-reviewer.md` reviews diffs against the skill and this file.
