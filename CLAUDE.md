# osrs-tracker-web

Angular 22 SSR app (zoneless, signals, standalone) on a custom Express server (`src/server/`), deployed to Kubernetes at
https://osrs-tracker.freekmencke.com. Sibling repos: `~/repos/osrs-tracker-api`, `~/repos/osrs-tracker-aws` (next to the
main checkout; `../` doesn't reach them from a worktree).

**Load the `osrs-tracker-web` skill before writing, reviewing, running, deploying or committing anything here.** It
holds the Angular conventions, SSR rules, deploy and release steps. Keep detail there, not in this file.

## Commands

- Verify: `.claude/skills/verify/verify.sh` runs CI's checks at once (the list is in the `verify` skill) and reports
  every failure. The `verify` skill runs it; Claude Code's commit instructions run that before each commit of a code
  change.
- One spec: `npx ng test --watch=false --include <path>`
- Dev server: `npm start`, always on port 4200 (the API's CORS allows only that).
- Worktrees in `.claude/worktrees/` use the main checkout's `node_modules` (found in a parent folder), which match the
  main checkout's lockfile, not the worktree's, and only if `npm ci` ran there after the last pull that changed it. If
  `diff -q package-lock.json ../../../package-lock.json` reports a difference or `npm ls --all --prefix ../../..` fails,
  run `npm ci` in the worktree (`verify.sh` checks both). Other sessions share port 4200: check `ss -ltn | grep :4200`
  before `npm start`. If it's taken by a server this session didn't start, it's another session's: don't stop it, wait
  or ask the user. Stop your own when done. A session edits only its own worktree; Claude Code blocks writes into
  another one.
- Claude Code's pushes run `.claude/hooks/pre-push-check.sh` first (lint and Prettier on the checkout being pushed).
  It's a PreToolUse hook, not a git hook: a push from your own terminal skips it.

## Hard rules

- Every change to the app, its dependencies or tooling gets a user-facing `CHANGELOG.md` entry under today's
  `## YYYY-MM-DD` (Europe/Amsterdam date); doc-only changes don't. Dependabot PRs don't either: after merging one whose
  bump changes behaviour (a new feature used, a fix that matters, a breaking change handled), commit a "Dependency
  updates" line under that day's "Behind the scenes" straight to `main`, describing the effect for users; bumps that
  change nothing get no entry. Parallel PRs all add that heading: when merging one after another, rebase and fold the
  entries under one heading. `/about/changelog` fetches the file from GitHub's `main` at runtime, so an entry is public
  the moment it reaches `main`: never push one ahead of its code.
- Doc-only changes (`docs/`, `.claude/skills/`, `.claude/agents/`, `CLAUDE.md`, `README.md`) go straight to `main`:
  commit in the worktree, `git fetch origin && git rebase origin/main`, then `git push origin HEAD:main`. For anything
  else, ask: `main` or a PR (unless releasing). `.claude/hooks/` and `.claude/settings.json` are tooling, not docs: they
  get a changelog entry and that question too.
- Deploying is merging to `main` (GitHub Actions `CD` → Flux). Never build, push or `kubectl apply` by hand.
- Never `--no-gpg-sign`, never `'unsafe-inline'` in the CSP, never write to disk at runtime (read-only root filesystem).
- Read `docs/decisions.md` before "fixing" something that looks odd; many trade-offs are deliberate.

## Where things live

- `src/app/features/<feature>/` single-feature code; `src/app/common/` shared code by theme: `ui/` the design system's
  components, `api/` the repositories (the only HTTP), `charts/` (Chart.js setup and the base chart), `format/`,
  `icon/`, `analytics/`, `storage/`, `theme/`, `seo/`, `paging/` (pages after a list's first), `player-count/` (the
  players-online store for the nav card and the page). Lint enforces these layers.
- `src/app/core/` app-wide plumbing: the app frame (`layout/`: nav, footer, theme toggle), interceptors (API base URL,
  loading bar, shared GET requests, SSR user agent, SSR timeout for third-party calls), routing (reuse strategy,
  resolver errors), platform (`WINDOW`, `isHumanVisitor`), the global error handler.
- `src/server/` the Express server: middleware (CSP nonce, security headers, request logging, metrics, missing assets,
  page cache), routers (the item and player sitemaps, link-preview images, health), `og/` (the link-preview cards), the
  auto-generator that pre-renders pages, `server-config.ts` (env vars).
- `docs/decisions.md` trade-offs, `docs/runbook.md` rollback and failure modes.
- `.claude/agents/conventions-reviewer.md` reviews diffs against the skill and this file;
  `.claude/hooks/read-only-bash.sh` keeps review agents to git, gh and grep reads.
- `.claude/agents/browser-checker.md` runs the skill's browser check in Playwright and returns a short report with
  screenshot paths, so screenshots stay out of the main session.
