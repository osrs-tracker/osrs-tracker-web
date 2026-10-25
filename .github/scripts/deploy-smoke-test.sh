#!/usr/bin/env bash
# CD's smoke test (deploy.yml): checks the web app itself, not the API, as pages with API data would fail on an API
# outage after a good deploy. Exits 1 when any check failed, after running them all.
# -e like GitHub's default `run` shell (bash -e), which a script run from it doesn't inherit
set -e

base=https://osrs-tracker.net
failed=0
expect() {
  status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$base$2" || true)
  echo "$2: $status (expected $1)"
  [ "$status" = "$1" ] || failed=1
}
# Pre-rendered by the page cache
home=$(curl -s -D - --max-time 30 "$base/" || true)
echo "/: $(printf '%s\n' "$home" | head -1 | cut -d' ' -f2) (expected 200)"
printf '%s\n' "$home" | head -1 | grep -q ' 200' || failed=1
printf '%s\n' "$home" | grep -q -i '^x-cache:' || { echo "/: no x-cache header, so the page cache isn't serving"; failed=1; }
# The bundle the page loads, from the static file server
main=$(printf '%s\n' "$home" | grep -o -E '<script src="main-[^"]+\.js"' | head -1 | cut -d'"' -f2)
if [ -n "$main" ]; then expect 200 "/$main"; else echo "/: no main-*.js script tag"; failed=1; fi
expect 200 /about/terms # Rendered on request, without API data
expect 404 /this-page-does-not-exist
exit "$failed"
