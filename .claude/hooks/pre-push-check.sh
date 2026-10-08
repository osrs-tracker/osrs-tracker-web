#!/usr/bin/env bash
# PreToolUse hook for every Bash command: before Claude runs `git push`, lint and prettier-check the checkout being
# pushed. That's the session's own worktree when it has one (or the `git -C` path), not $CLAUDE_PROJECT_DIR, which is
# always the main checkout. It fails open (exit 0) when it can't tell what's pushed; CI still lints.
input=$(cat)

# No `if` filter in the settings: `Bash(git push*)` misses `git -C <path> push`, so the script decides. Git options may
# come before `push`: -C/-c with their argument, or --flags.
cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
opt='[[:space:]]+(-[Cc][[:space:]]+[^[:space:]]+|--[^[:space:]]+)'
push_re="(^|[;&|(]|[[:space:]])git(${opt})*[[:space:]]+push([[:space:]]|\$)"
[[ $cmd =~ $push_re ]] || exit 0

dir=$(jq -r '.cwd // empty' <<<"$input")
dir=${dir:-$CLAUDE_PROJECT_DIR}
# `git -C <path> push`: the last -C wins, a relative path is relative to the command's cwd
c_re='[[:space:]]-C[[:space:]]+([^[:space:]]+)'
c=
rest=${BASH_REMATCH[0]}
while [[ $rest =~ $c_re ]]; do
  c=${BASH_REMATCH[1]}
  rest=${rest#*"${BASH_REMATCH[0]}"}
done
if [ -n "$c" ]; then
  c=${c//[\"\']/}
  c=${c/#\~/$HOME}
  case $c in /*) ;; *) c=$dir/$c ;; esac
  # Unexpanded variables and the like: check the command's cwd instead
  [ -d "$c" ] && dir=$c
fi
root=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

if ! out=$({ npm run -s lint && npm run -s prettier:ci; } 2>&1); then
  printf 'Push blocked: lint or prettier check failed in %s.\n%s\n' "$root" "$(tail -40 <<<"$out")" >&2
  exit 2
fi
