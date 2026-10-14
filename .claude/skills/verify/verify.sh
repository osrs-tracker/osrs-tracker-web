#!/usr/bin/env bash
# Runs every verify check at once (none waits for or stops at another's failure), then prints each failed one's output,
# the fast ones first, and a summary. Exits 1 when any check failed. Run from the checkout's root.
set -u
# Plain output: the logs are read by Claude, not a terminal
export NO_COLOR=1 FORCE_COLOR=0

# A worktree without its own node_modules uses the main checkout's, which match the main checkout's lockfile, not the
# worktree's, and only if someone ran npm ci there after the last pull that changed it (npm ls fails when the installed
# packages don't satisfy package.json). Either way, install into the worktree: replacing the main checkout's packages
# would pull them out from under other sessions.
if [[ $PWD == */.claude/worktrees/* ]]; then
  if [ -d node_modules ]; then root=.; else root=../../..; fi
  if ! diff -q package-lock.json "$root/package-lock.json" >/dev/null \
    || ! npm ls --all --prefix "$root" >/dev/null 2>&1; then
    echo "=== $root/node_modules doesn't match this worktree's package-lock.json: npm ci"
    npm ci --no-audit --no-fund >/dev/null || exit 1
  fi
fi

names=(lint prettier test build)
commands=(
  'npx ng lint'
  'npm run prettier:ci'
  'npx ng test --watch=false'
  # Not `npm run build`, which regenerates the sitemaps and icons and so changes tracked files
  'npx ng build --configuration production'
)

# Kept when a check fails, so its full log can be read further
out=$(mktemp -d -t verify.XXXXXX)

for i in "${!names[@]}"; do
  (
    start=$SECONDS
    bash -c "${commands[$i]}" >"$out/${names[$i]}.log" 2>&1
    echo "$? $((SECONDS - start))" >"$out/${names[$i]}.status"
  ) &
done
wait

summary=()
failed=0
for i in "${!names[@]}"; do
  log="$out/${names[$i]}.log"
  read -r code secs <"$out/${names[$i]}.status"
  if [ "$code" -eq 0 ]; then
    summary+=("passed  ${names[$i]} (${secs}s): ${commands[$i]}")
  else
    failed=1
    summary+=("FAILED  ${names[$i]} (${secs}s): ${commands[$i]}")
    echo "=== ${names[$i]} failed: ${commands[$i]} (full log: $log)"
    if [ "$(wc -l <"$log")" -gt 80 ]; then
      echo '(last 60 lines)'
      tail -n 60 "$log"
    else
      cat "$log"
    fi
    echo
  fi
done

echo '=== Summary'
printf '%s\n' "${summary[@]}"
[ "$failed" -eq 0 ] && rm -rf "$out"
exit "$failed"
