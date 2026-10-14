#!/usr/bin/env bash
# CD's wait for Flux (deploy.yml): waits up to 10 minutes for the `Flux / sync` commit status on the deploy commit SHA,
# and fails when Flux reports a failure or never reports. Reads SHA, GH_TOKEN and REPO.
# Keep in step with osrs-tracker-api's deploy.yml ("Wait for Flux to deploy it"), which does the same.
# -e like GitHub's default `run` shell (bash -e), which a script run from it doesn't inherit
set -e

flux_status() {
  gh api "repos/$REPO/commits/$1/status" \
    --jq '[.statuses[] | select(.context == "Flux / sync") | "\(.state) \(.description)"] | first // ""' \
    2>/dev/null || true
}
deadline=$((SECONDS + 600))
while :; do
  applied=$SHA
  status=$(flux_status "$SHA")
  echo "Flux / sync on $SHA: ${status:-no status yet}"
  # Flux applies main's tip and reports on it, so a push right after this one may get the status instead
  if [ -z "$status" ]; then
    tip=$(gh api "repos/$REPO/commits/main" --jq .sha 2>/dev/null || true)
    if [ -n "$tip" ] && [ "$tip" != "$SHA" ] \
      && [ "$(gh api "repos/$REPO/compare/$SHA...$tip" --jq .status 2>/dev/null)" = ahead ]; then
      status=$(flux_status "$tip")
      if [ -n "$status" ]; then
        applied=$tip
        echo "main moved on to $tip, which contains $SHA. Flux / sync on it: $status"
      fi
    fi
  fi
  case "${status%% *}" in
    success) echo "Flux deployed $SHA$([ "$applied" = "$SHA" ] || echo " with $applied")."; exit 0 ;;
    failure | error) echo "::error::Flux failed to deploy $applied: $status. Check the Discord alerts."; exit 1 ;;
  esac
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "::error::No successful Flux / sync status on $SHA or a newer main after 10 minutes"
    exit 1
  fi
  sleep 15
done
