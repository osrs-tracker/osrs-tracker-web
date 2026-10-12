---
name: verify
description:
  Runs osrs-tracker-web's verify checks (production build, lint, Prettier, unit tests) and reports each one's result.
  Use right before each commit of a code change, and when asked to verify, check or test the repo before a push or PR.
---

# verify

Run from the checkout being committed (the worktree, not the main checkout). In a worktree, first check the dependencies
match: if `diff -q package-lock.json ../../../package-lock.json` reports a difference, run `npm ci`.

Run each step in order and stop at the first failure:

1. `npx ng build --configuration production`
2. `npx ng lint`
3. `npm run prettier:ci`
4. `npx ng test --watch=false`

Report one line per step: passed, failed or not run. For a failure, quote the relevant output (the errors, not the whole
log), fix it if it's in the change being committed, and run the checks again from that step. Don't commit while a step
fails, and never claim a pass without its output.

`npm run prettier:ci` failing on files you changed: `npx prettier --write <files>`. The build doesn't regenerate
sitemaps or icons (`npm run build` does), so it leaves no tracked files changed.
