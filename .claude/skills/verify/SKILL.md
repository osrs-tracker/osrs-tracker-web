---
name: verify
description:
  Runs osrs-tracker-web's verify checks (production build, lint, Prettier, unit tests) and reports each one's result.
  Use right before each commit of a code change, and when asked to verify, check or test the repo before a push or PR.
---

# verify

Run from the checkout being committed (the worktree, not the main checkout). In a worktree, first check the dependencies
match: if `diff -q package-lock.json ../../../package-lock.json` reports a difference, run `npm ci`.

Run all four checks, cheapest first, even when an earlier one fails: the checks don't depend on each other, and one
round of fixes for every failure costs less than a round per failure.

1. `npx ng lint`
2. `npm run prettier:ci`
3. and 4., in one Bash call, tests and build in parallel (about 20% faster than one after the other on the dev machine),
   with their logs in your scratchpad directory:

   ```bash
   d=<scratchpad>; npx ng test --watch=false >"$d/test.log" 2>&1 & t=$!
   npx ng build --configuration production >"$d/build.log" 2>&1; b=$?; wait $t; s=$?
   echo "test: $s, build: $b"; [ $s = 0 ] || tail -60 "$d/test.log"; [ $b = 0 ] || tail -60 "$d/build.log"
   ```

Report one line per check: passed or failed. For each failure, quote the relevant output (the errors, not the whole log;
read more of the log file if the tail cuts them off). Fix every failure that's in the change being committed in one
round, then run all four again. Don't commit while a check fails, and never claim a pass without its output.

`npm run prettier:ci` failing on files you changed: `npx prettier --write <files>`. The build doesn't regenerate
sitemaps or icons (`npm run build` does), so it leaves no tracked files changed.
