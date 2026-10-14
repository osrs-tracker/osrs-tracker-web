#!/usr/bin/env bash
# CD's commit step (deploy.yml): commits the image digest to osrs-tracker-web.yaml, with the sitemaps the build
# regenerated, and pushes it to main. Writes sha=<deploy commit> to $GITHUB_OUTPUT, or nothing when the image is
# unchanged. Reads IMAGE, DIGEST and SOURCE_SHA; runs in .deploy, a checkout of main inside the one the image was built
# from, whose public/ has the regenerated sitemaps.
# -e like GitHub's default `run` shell (bash -e), which a script run from it doesn't inherit
set -e

sed -i -E "s#^( *image: $IMAGE)@sha256:[0-9a-f]{64}\$#\1@$DIGEST#" osrs-tracker-web.yaml
if ! grep -q -E "^ *image: $IMAGE@$DIGEST\$" osrs-tracker-web.yaml; then
  echo "::error::Couldn't find the image: line in osrs-tracker-web.yaml"
  exit 1
fi
cp ../public/sitemap*.xml public/

# Docker builds the same image when nothing in it changed: then there's nothing to deploy or check
if git diff --quiet -- osrs-tracker-web.yaml; then
  echo "The image is unchanged ($DIGEST), skipping the deploy commit."
  exit 0
fi

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add osrs-tracker-web.yaml public/sitemap*.xml
# The Deployed-from trailer tells later runs what's live. CI ignores pushes that only change the manifest and
# sitemaps, so this commit starts no second deploy; if it did, the plan step would skip it.
git commit --quiet -m "chore(deploy): deploy ${DIGEST:0:15} and update sitemaps" \
  -m "Deployed-from: $SOURCE_SHA"

# If main moved meanwhile, rebase and retry once. A conflict (someone changed the image line) fails the job.
if ! git push origin HEAD:main; then
  git pull --rebase origin main
  git push origin HEAD:main
fi
echo "sha=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"
