# osrs-tracker-web

Angular 22 SSR app (zoneless, signals, standalone) on a custom Express server (`src/server/`), deployed to Kubernetes at
https://osrs-tracker.freekmencke.com. Sibling repos: `~/repos/osrs-tracker-api`, `~/repos/osrs-tracker-aws` (next to the
main checkout; `../` doesn't reach them from a worktree).

**Load the `osrs-tracker-web` skill before writing, reviewing, running, deploying or committing anything here.** It
holds the Angular conventions, SSR rules, deploy and release steps. Keep detail there, not in this file.

## Commands

- Verify: `npx ng build --configuration production && npx ng lint && npm run prettier:ci && npx ng test --watch=false`
- One spec: `npx ng test --watch=false --include <path>`
- Dev server: `npm start`, always on port 4200 (the API's CORS allows only that).
- Worktrees in `.claude/worktrees/` use the main checkout's `node_modules` (found in a parent folder), which match the
  main checkout's lockfile, not the worktree's. If `diff -q package-lock.json ../../../package-lock.json` reports a
  difference (deps bumped on either side), run `npm ci` in the worktree. Other sessions share port 4200: check
  `ss -ltn | grep :4200` before `npm start`, and stop it when done. A session edits only its own worktree; Claude Code
  blocks writes into another one.
- Claude Code's pushes run `.claude/hooks/pre-push-check.sh` first (lint and Prettier on the checkout being pushed).
  It's a PreToolUse hook, not a git hook: a push from your own terminal skips it.

## Hard rules

- Every change to the app, its dependencies or tooling gets a user-facing `CHANGELOG.md` entry under today's
  `## YYYY/MM/DD` (Europe/Amsterdam date); doc-only changes don't. Parallel PRs all add that heading: when merging one
  after another, rebase and fold the entries under one heading. `/about/changelog` fetches the file from GitHub's `main`
  at runtime, so an entry is public the moment it reaches `main`: never push one ahead of its code.
- Doc-only changes (`docs/`, `.claude/skills/`, `.claude/agents/`, `CLAUDE.md`, `README.md`) go straight to `main`:
  commit in the worktree, `git fetch origin && git rebase origin/main`, then `git push origin HEAD:main`. For anything
  else, ask: `main` or a PR (unless releasing). `.claude/hooks/` and `.claude/settings.json` are tooling, not docs: they
  get a changelog entry and that question too.
- Deploying is merging to `main` (GitHub Actions `CD` → Flux). Never build, push or `kubectl apply` by hand.
- Never `--no-gpg-sign`, never `'unsafe-inline'` in the CSP, never write to disk at runtime (read-only root filesystem).
- Read `docs/decisions.md` before "fixing" something that looks odd; many trade-offs are deliberate.

## Where things live

- `src/app/features/<feature>/` single-feature code; `src/app/common/` shared code, HTTP only via
  `common/repositories/`.
- `src/app/core/` app-wide plumbing: interceptors (API base URL, loading bar, shared GET requests, SSR user agent, SSR
  timeout for third-party calls), routing (reuse strategy, resolver errors), platform (`WINDOW`, `isHumanVisitor`), the
  global error handler.
- `src/server/` the Express server: middleware (CSP nonce, security headers, request logging, metrics, missing assets,
  page cache), the auto-generator that pre-renders pages, `server-config.ts` (env vars).
- `docs/decisions.md` trade-offs, `docs/runbook.md` rollback and failure modes.
- `.claude/agents/conventions-reviewer.md` reviews diffs against the skill and this file.
