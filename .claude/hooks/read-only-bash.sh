#!/usr/bin/env bash
# PreToolUse hook for read-only review agents (set in their frontmatter, so it runs only while they do): allow one
# plain git, gh or grep read command per call and block everything else with exit 2. Allowed commands still go through
# the normal permission rules. Frontmatter hooks are skipped in untrusted folders and in `claude -p`.
cmd=$(jq -r '.tool_input.command // empty')

case $cmd in
  *';'* | *'&'* | *'|'* | *'>'* | *'<'* | *'$('* | *'`'* | *$'\n'* | *--output* | *--upload-pack* | *--exec*)
    echo 'Read-only reviewer: one plain git or gh read command per call (no chaining, pipes, redirects, --output, --upload-pack or --exec).' >&2
    exit 2
    ;;
esac

# Options that run a command or open an interactive UI: git grep -O / --open-files-in-pager, and ugrep's -Q / --query,
# --filter, --pager and --view (Claude Code's grep is ugrep). A short option may be bundled (-nO).
if [[ $cmd =~ (^|\ )-[A-Za-z]*[OQ] || $cmd =~ --(open-files-in-pager|query|filter|pager|view) ]]; then
  echo 'Read-only reviewer: no -O, -Q, --open-files-in-pager, --query, --filter, --pager or --view.' >&2
  exit 2
fi

git_re='^git( -C [^ ]+)? (diff|log|show|status|fetch|rev-parse|merge-base|ls-files|blame|grep)( |$)'
gh_re='^gh pr (view|diff|checks)( |$)'
grep_re='^grep( |$)'
[[ $cmd =~ $git_re || $cmd =~ $gh_re || $cmd =~ $grep_re ]] && exit 0

echo 'Read-only reviewer: allowed are git diff/log/show/status/fetch/rev-parse/merge-base/ls-files/blame/grep, gh pr view/diff/checks and grep.' >&2
exit 2
