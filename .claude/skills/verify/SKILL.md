---
name: verify
description:
  Runs osrs-tracker-web's verify checks (lint, Prettier, unit tests, production build) and reports each one's result.
  Use right before each commit of a code change, and when asked to verify, check or test the repo before a push or PR.
---

# verify

Run the script from the checkout being committed (the worktree, not the main checkout), in one Bash call:

```bash
.claude/skills/verify/verify.sh
```

In a worktree whose `package-lock.json` differs from the main checkout's, it runs `npm ci` first. Then it runs these
checks at once (about 9 s on the dev machine, against 18 s one after another), never stopping at a failure, prints the
output of each failed check (the last 60 lines of a long log, with the full log's path) and a summary line per check,
and exits 1 when any failed:

1. `npx ng lint`
2. `npm run prettier:ci`
3. `npx ng test --watch=false` (Vitest doesn't type-check the specs, but `ng test` compiles them, so a type error fails
   it)
4. `npx ng build --configuration production`: not `npm run build`, which regenerates sitemaps and icons and so changes
   tracked files

Report one line per check: passed or failed. For each failure, quote the relevant output (the errors, not the whole
log). Fix every failure that's in the change being committed in one round, then run the script again. Don't commit while
a check fails, never claim a pass without its output, and don't drop a check to save time: the push gate covers only
lint and Prettier.

`npm run prettier:ci` failing on files you changed: `npx prettier --write <files>`.
