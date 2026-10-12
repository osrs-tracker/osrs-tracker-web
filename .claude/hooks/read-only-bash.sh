#!/usr/bin/env bash
# PreToolUse hook for read-only review agents (set in their frontmatter, so it runs only while they do): allow one
# plain git or gh read command per call and block everything else with exit 2. Allowed commands still go through the
# normal permission rules. Frontmatter hooks are skipped in untrusted folders and in `claude -p`.
cmd=$(jq -r '.tool_input.command // empty')

case $cmd in
  *';'* | *'&'* | *'|'* | *'>'* | *'<'* | *'$('* | *'`'* | *$'\n'* | *--output*)
    echo 'Read-only reviewer: one plain git or gh read command per call (no chaining, pipes, redirects or --output).' >&2
    exit 2
    ;;
esac

git_re='^git( -C [^ ]+)? (diff|log|show|status|fetch|rev-parse|merge-base|ls-files|blame)( |$)'
gh_re='^gh pr (view|diff|checks)( |$)'
[[ $cmd =~ $git_re || $cmd =~ $gh_re ]] && exit 0

echo 'Read-only reviewer: allowed are git diff/log/show/status/fetch/rev-parse/merge-base/ls-files/blame and gh pr view/diff/checks.' >&2
exit 2
