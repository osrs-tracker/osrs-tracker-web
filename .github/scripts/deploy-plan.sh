#!/usr/bin/env bash
# CD's plan step (deploy.yml): picks the commit to deploy and checks it out. Writes deploy=true and sha=<commit> to
# $GITHUB_OUTPUT, or deploy=false when there's nothing to deploy. Reads RUN_SHA, CI_WORKFLOW_ID, NOT_IN_IMAGE, GH_TOKEN
# and REPO; runs in a checkout of main.
# -e like GitHub's default `run` shell (bash -e), which a script run from it doesn't inherit
set -e

target=$RUN_SHA
tip=$(git rev-parse HEAD)
# A later commit's own run may have been replaced in the queue by this one, so take main's tip if CI passed there
if [ "$tip" != "$RUN_SHA" ]; then
  tip_ci=$(gh api "repos/$REPO/actions/workflows/$CI_WORKFLOW_ID/runs?head_sha=$tip&event=push" \
    --jq '.workflow_runs[0].conclusion // ""' 2>/dev/null || true)
  if [ "$tip_ci" = success ]; then
    echo "CI passed on main's tip $tip, deploying that instead of $RUN_SHA."
    target=$tip
  fi
fi

# A reverted digest commit is a rollback: building it would deploy the code it rolls back
if git log -1 --format=%s "$target" | grep -q '^Revert "chore(deploy)'; then
  echo "$target rolls back a deploy, skipping."
  echo "deploy=false" >> "$GITHUB_OUTPUT"
  exit 0
fi

# Every deploy commit records the commit its image was built from
deployed=$(git log -1 --grep='^Deployed-from: ' --format='%(trailers:key=Deployed-from,valueonly)' HEAD \
  | tr -d '[:space:]')
if [ -n "$deployed" ] && git merge-base --is-ancestor "$target" "$deployed" 2>/dev/null; then
  echo "$target is already deployed (the live image was built from $deployed), skipping."
  echo "deploy=false" >> "$GITHUB_OUTPUT"
  exit 0
fi
if [ -n "$deployed" ] && files=$(git diff --name-only "$deployed" "$target" 2>/dev/null) \
  && ! printf '%s\n' "$files" | grep -q -v -E "$NOT_IN_IMAGE"; then
  printf 'Only files outside the image changed since %s, skipping:\n%s\n' "$deployed" "$files"
  echo "deploy=false" >> "$GITHUB_OUTPUT"
  exit 0
fi

echo "Deploying $target (last deployed: ${deployed:-unknown})."
git checkout --quiet --detach "$target"
echo "deploy=true" >> "$GITHUB_OUTPUT"
echo "sha=$target" >> "$GITHUB_OUTPUT"
