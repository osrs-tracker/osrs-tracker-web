#!/usr/bin/env bash
# CI's `changes` job (nodejs.yml): writes code=true to $GITHUB_OUTPUT when build and test must run, code=false when they
# may skip. Reads BEFORE and AFTER (the commits to compare), GH_TOKEN, REPO and GITHUB_EVENT_NAME.
# -e like GitHub's default `run` shell (bash -e), which a script run from it doesn't inherit
set -e

# Deploy commits get no CI run (paths-ignore in nodejs.yml), so they have no results to compare with. Step back past
# them to the last commit that went through CI, or the next push would rebuild even for docs.
if [ "$GITHUB_EVENT_NAME" = push ] && [ -n "$BEFORE" ]; then
  for _ in 1 2 3 4 5; do
    only=$(git diff --name-only "$BEFORE^" "$BEFORE" 2>/dev/null) || break
    printf '%s\n' "$only" | grep -q -v -E '^(osrs-tracker-web\.yaml|public/sitemap[^/]*\.xml)$' && break
    echo "$BEFORE only changes the manifest or sitemaps (no CI run), comparing with its parent."
    BEFORE=$(git rev-parse "$BEFORE^")
  done
fi
if [ -z "$BEFORE" ] || [ "$BEFORE" = 0000000000000000000000000000000000000000 ] \
  || ! files=$(git diff --name-only "$BEFORE" "$AFTER" 2>/dev/null); then
  echo "No previous commit to compare with, running everything."
  echo "code=true" >> "$GITHUB_OUTPUT"
  exit 0
fi
printf 'Changed files:\n%s\n' "$files"
if printf '%s\n' "$files" | grep -v -E '^public/sitemap[^/]*\.xml$' \
  | grep -q -E '^(src/|public/|scripts/|\.github/|package(-lock)?\.json$|angular\.json$|tsconfig[^/]*\.json$|\.postcssrc\.json$)'; then
  echo "code=true" >> "$GITHUB_OUTPUT"
  exit 0
fi
# Skipping is only safe if build and test passed (or were safely skipped) on the commit compared with;
# otherwise a docs-only push after a failed build would turn the PR green
previous=$(gh api "repos/$REPO/commits/$BEFORE/check-runs?filter=latest&per_page=100" \
  --jq '[.check_runs[] | select(.name == "build" or .name == "test") | "\(.name)=\(.conclusion)"] | sort | join(" ")' \
  2>/dev/null || true)
if [ "$previous" = "build=success test=success" ] || [ "$previous" = "build=skipped test=skipped" ]; then
  echo "No source or dependency changes and $BEFORE passed ($previous), skipping build and test."
  echo "code=false" >> "$GITHUB_OUTPUT"
else
  echo "No source or dependency changes, but $BEFORE didn't pass build and test (${previous:-no results}), running them."
  echo "code=true" >> "$GITHUB_OUTPUT"
fi
