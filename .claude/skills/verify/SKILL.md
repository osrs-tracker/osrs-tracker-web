---
name: verify
description:
  Runs osrs-tracker-web's verify checks (lint, Prettier, knip, jscpd, ShellCheck, links, unit tests, production build)
  and reports each one's result. Use right before each commit of a code change, and when asked to verify, check or test
  the repo before a push or PR.
---

# verify

Run the script from the checkout being committed (the worktree, not the main checkout), in one Bash call:

```bash
.claude/skills/verify/verify.sh
```

In a worktree whose `package-lock.json` differs from the main checkout's, or whose shared `node_modules` doesn't match
it, it runs `npm ci` first. Then it runs these checks at once (about 10 s on the dev machine, against about 30 s one
after another), never stopping at a failure, prints the output of each failed check (the last 60 lines of a long log,
with the full log's path) and a summary line per check, and exits 1 when any failed:

1. `npx ng lint` (also `import-x/no-cycle`: no circular imports)
2. `npm run prettier:ci`
3. `npx knip`: unused files, exports and dependencies. An export only its own file uses loses its `export`; a false
   positive goes in `knip.jsonc` with a comment saying why
4. `npx jscpd`: copy-pasted code in `src/` (TypeScript, templates and CSS; `.jscpd.json` leaves out specs, `testing/`
   and generated files; import statements don't count, as repeating them copies no code), failing over 1% duplicated
   lines. Move the copy into one place (`common/` when two features need it); never raise the threshold to pass
5. `shellcheck` on `.github/scripts/*.sh`, `.claude/hooks/*.sh` and `.claude/skills/*/*.sh`, as CI's lint job does
6. `lychee --offline --hidden --include-fragments --exclude-path node_modules './**/*.md'`, CI's links job: local links
   and `#anchors` in the Markdown. CI has no `node_modules` to skip; a checkout here does, and its packages' READMEs
   would fail the check
7. `npx ng test --watch=false` (Vitest doesn't type-check the specs, but `ng test` compiles them, so a type error fails
   it)
8. `npx ng build --configuration production`: not `npm run build`, which regenerates sitemaps and icons and so changes
   tracked files

Report one line per check: passed, failed or skipped. For each failure, quote the relevant output (the errors, not the
whole log). Fix every failure that's in the change being committed in one round, then run the script again. Don't commit
while a check fails, never claim a pass without its output, and don't drop a check to save time: the push gate covers
only lint and Prettier.

ShellCheck and lychee are system binaries, not npm packages: where one isn't installed, the summary says it was skipped
and only CI checks those files, so say so in the report. To install them, use the versions CI uses (ShellCheck 0.9.0 on
Ubuntu 24.04; lychee is the version `lycheeverse/lychee-action`'s pin in `nodejs.yml` defaults to, `lycheeVersion` in
its `action.yml`):

```bash
sudo apt install shellcheck
```

```bash
gh release download lychee-v0.24.2 -R lycheeverse/lychee -p lychee-x86_64-unknown-linux-gnu.tar.gz -O - | tar -xz -C ~/.local/bin --strip-components=1 lychee-x86_64-unknown-linux-gnu/lychee
```

`npm run prettier:ci` failing on files you changed: `npx prettier --write <files>`.
