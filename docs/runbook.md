# Runbook

What to do when osrs-tracker.freekmencke.com misbehaves in production. Deploying is described in the project skill
(`.claude/skills/osrs-tracker-web/SKILL.md`).

## Roll back

Flux runs whatever `osrs-tracker-web.yaml` on `main` says, and every deploy pins an image digest there in a commit named
`chore(deploy): deploy sha256:… and update sitemaps`. To roll back, revert the bad deploy commit on `main`:

```bash
git log --oneline -- osrs-tracker-web.yaml   # find the bad deploy commit
git revert <commit>                          # puts the previous digest (and sitemaps) back
git push                                     # admins bypass the PR rule; or open a PR
```

Flux applies it within a minute and reports the `Flux / deploy` status on the revert commit
(`gh api repos/osrs-tracker/osrs-tracker-web/commits/<sha>/status`). The revert only changes the manifest and sitemaps,
so neither CI nor the `CD` workflow runs for it and the bad code isn't rebuilt (`CD` would skip a deploy revert anyway).
The bad code is still on `main`, though: the next change that touches the image deploys it again unless that change
fixes or reverts it. A `kubectl apply` or `kubectl set image` by hand is undone by Flux within 10 minutes.

A deploy that fails Flux's 5-minute health check fails the `CD` workflow run and alerts the Discord alerts channel;
Kubernetes keeps the old pods serving until new ones are ready. If it says "forbidden", the manifest uses a kind Flux
isn't allowed to manage yet: that's fixed in FreekMencke/home-cluster's `cluster/osrs-tracker/flux.yaml`, not here.

## Look around

- Pods and events: `kubectl -n osrs-tracker get pods` and `kubectl -n osrs-tracker describe deploy osrs-tracker-web`.
- Logs: `kubectl -n osrs-tracker logs deploy/osrs-tracker-web --since=15m`, or Loki in Grafana (grafana.freekmencke.com)
  for older logs. Requests are logged as JSON with `status`, `route` and `cache`.
- Metrics: the Express dashboard in Grafana (request rate, status codes and latency per route label).
- Resources: `kubectl -n osrs-tracker top pods`. The pods request 50m CPU and 128Mi memory, with a 512Mi memory limit
  (no CPU limit). A pod that hits the limit is `OOMKilled` (see `describe pod`).

## Health checks

- Readiness and startup: `GET /healthy` on the app port (8080). A pod failing it is taken out of the service.
- Liveness: `GET /healthy` on the metrics port (9090). Failing it restarts the pod.
- On shutdown, a 5 s `preStop` delay keeps the pod serving until Traefik has dropped it, then the server closes its
  connections (forced after 10 s). A PodDisruptionBudget keeps at least one of the two pods up during node maintenance.

## Recheck the GE tax rules

"Margin after tax" and the profit calculator use the Grand Exchange tax from
`src/app/features/trackers/price-tracker/item-detail/ge-tax.ts`: the rate, the per-item cap and the exempt item ids,
copied by hand from the [Wiki section](https://oldschool.runescape.wiki/w/Grand_Exchange#Convenience_fee_and_item_sink)
(why: "GE tax rules are hard-coded" in `docs/decisions.md`). Nothing else notices when Jagex changes them, so recheck
when a GE or game-integrity update ships, or when the monthly `GE tax check` workflow fails:

```bash
npm run check:ge-tax
```

It compares the rate, the cap and the exempt items (by name, through the Wiki's item mapping) with the Wiki and lists
every difference. Then:

1. Fix `ge-tax.ts`: the constants, and the exempt ids with the item name as a comment. A Wiki name the script can't map
   to an item is usually a page title that differs from the item name; look the id up on the item's Wiki page.
2. Read the Wiki section for changes the script can't see, such as the rounding, and update `geTax` and
   `breakEvenSellPrice` (and `ge-tax.spec.ts`) if they changed.
3. Update the "last checked" date in `ge-tax.ts`, add a `CHANGELOG.md` entry if the numbers changed, and deploy.

If the script itself fails (the Wiki renamed a section or reworded the rate), fix its patterns in
`scripts/ge-tax/check-ge-tax.mjs`.

## Known upstream failures

The site keeps working when a data source is down. The affected parts show "Couldn't load…" with a Retry button, and
opening a player or item page shows an error page (503).

| Source                                                | What breaks                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| osrs-tracker-api (osrs-tracker-api.freekmencke.com)   | Player and item pages (error page), recent lookups, the news |
| Hiscores proxy (runescape-api.freekmencke.com, AWS)   | Current hiscores on player pages, the player cards           |
| OSRS Wiki prices (prices.runescape.wiki, third party) | Item price trends and charts                                 |

The API and the hiscores proxy are maintained in osrs-tracker-api and osrs-tracker-aws. Check them there before changing
anything here.
