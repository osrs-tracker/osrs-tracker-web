# Runbook

What to do when osrs-tracker.freekmencke.com misbehaves in production. Deploying is described in the project skill
(`.claude/skills/osrs-tracker-web/SKILL.md`).

## Roll back

Every deploy pins an image digest in `osrs-tracker-web.yaml`, and every deploy commit is named
`chore(deploy): osrs-tracker-web@sha256:…`. To roll back, put the previous digest back and apply it:

```bash
git log --oneline -- osrs-tracker-web.yaml   # find the previous deploy commit
git show <commit>:osrs-tracker-web.yaml | grep image:
# put that digest in osrs-tracker-web.yaml, then:
kubectl diff -f osrs-tracker-web.yaml
kubectl apply -f osrs-tracker-web.yaml && kubectl -n osrs-tracker rollout status deploy/osrs-tracker-web --timeout=300s
```

Commit the reverted digest afterwards, so `main` matches what's running.

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
