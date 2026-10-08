#!/usr/bin/env bash
# PreToolUse hook: before Claude runs `git push`, lint and prettier-check the checkout being pushed. That's the session's
# own worktree when it has one, not $CLAUDE_PROJECT_DIR (the main checkout), so other worktrees can't block the push.
input=$(cat)

# The settings' `if` filter also lets through compound commands it can't parse (heredocs), so check for a push here too
cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
grep -q -E '(^|[;&|(]|[[:space:]])git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push([[:space:]]|$)' \
  <<<"$cmd" || exit 0

dir=$(jq -r '.cwd // empty' <<<"$input")
root=$(git -C "${dir:-$CLAUDE_PROJECT_DIR}" rev-parse --show-toplevel 2>/dev/null) || root=$CLAUDE_PROJECT_DIR
cd "$root" || exit 0

if ! out=$({ npm run -s lint && npm run -s prettier:ci; } 2>&1); then
  printf 'Push blocked: lint or prettier check failed in %s.\n%s\n' "$root" "$(tail -40 <<<"$out")" >&2
  exit 2
fi
