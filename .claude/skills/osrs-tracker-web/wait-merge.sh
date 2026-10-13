#!/usr/bin/env bash
# Waits until a PR queued with `gh pr merge --merge` leaves the merge queue: merged, closed, or removed by the queue
# (then still OPEN). Prints the final state. Usage: wait-merge.sh <pr-number>
set -euo pipefail
n=${1:?usage: wait-merge.sh <pr-number>}
query='query($n: Int!) { repository(owner: "osrs-tracker", name: "osrs-tracker-web") { pullRequest(number: $n) {
  state isInMergeQueue autoMergeRequest { enabledAt } } } }'
while :; do
  # OPEN while queued, or waiting on its checks with auto-merge on; anything else means the queue is done with it
  state=$(gh api graphql -F n="$n" -f query="$query" --jq '.data.repository.pullRequest |
    if .state == "OPEN" and (.isInMergeQueue or .autoMergeRequest != null) then "QUEUED" else .state end')
  [ "$state" != QUEUED ] && break
  sleep 30
done
echo "$state"
