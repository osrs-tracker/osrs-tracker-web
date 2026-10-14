#!/usr/bin/env bash
# CD's wait for Flux (deploy.yml): waits up to 10 minutes for the `Flux / sync` commit status on the deploy commit SHA,
# and fails when Flux reports a failure or never reports. Reads SHA, GH_TOKEN and REPO.
# -e like GitHub's default `run` shell (bash -e), which a script run from it doesn't inherit
set -e

flux_state() {
  gh api "repos/$REPO/commits/$1/status" \
    --jq '[.statuses[] | select(.context == "Flux / sync") | .state][0] // ""' 2>/dev/null || true
}
deadline=$((SECONDS + 600))
while :; do
  state=$(flux_state "$SHA")
  # Flux applies main's tip, so a commit pushed right after this one may get the status instead
  if [ -z "$state" ]; then
    tip=$(gh api "repos/$REPO/commits/main" --jq .sha 2>/dev/null || true)
    if [ -n "$tip" ] && [ "$tip" != "$SHA" ] \
      && [ "$(gh api "repos/$REPO/compare/$SHA...$tip" --jq .status 2>/dev/null)" = ahead ]; then
      state=$(flux_state "$tip")
      [ -n "$state" ] && echo "main moved on to $tip, which Flux deployed instead."
    fi
  fi
  case $state in
    success) echo "Flux deployed $SHA."; exit 0 ;;
    failure | error) echo "::error::Flux failed to deploy $SHA ($state). Check the Discord alerts."; exit 1 ;;
  esac
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "::error::No 'Flux / sync' status on $SHA after 10 minutes"
    exit 1
  fi
  sleep 15
done
