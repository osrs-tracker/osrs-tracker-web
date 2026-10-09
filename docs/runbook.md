# Runbook

What to do when osrs-tracker.freekmencke.com misbehaves in production. Deploying is described in the project skill
(`.claude/skills/osrs-tracker-web/SKILL.md`).

## Roll back

Flux runs whatever `osrs-tracker-web.yaml` on `main` says, and every deploy pins an image digest there in a commit named
`chore(deploy): deploy sha256:… and update sitemaps`. To roll back, revert the bad deploy commit on `main`:

```bash
git fetch origin
git switch --detach origin/main              # in a worktree, `main` is checked out elsewhere
git log --oneline -- osrs-tracker-web.yaml   # find the bad deploy commit
git revert <commit>                          # signed, like every commit; puts the previous digest (and sitemaps) back
git push origin HEAD:main                    # admins bypass the PR rule; or push a branch and open a PR
```

A plain `git push` from a worktree pushes its own branch and rolls nothing back. If the push is rejected because `main`
moved, `git pull --rebase origin main` and push again.

Flux applies it within a minute and reports the `Flux / sync` status on the revert commit
(`gh api repos/osrs-tracker/osrs-tracker-web/commits/<sha>/status`). The revert only changes the manifest and sitemaps,
so neither CI nor the `CD` workflow runs for it and the bad code isn't rebuilt (`CD` would skip a deploy revert anyway).
The bad code is still on `main`, though: the next change that touches the image deploys it again unless that change
fixes or reverts it. A `kubectl apply` or `kubectl set image` by hand is undone by Flux within 10 minutes.

## A `CD` run failed

A failed run alerts the Discord alerts channel. Find the failed step (`gh run view <id> --log-failed`), then:

| Failed step                           | What it means                                                                                                     | Do                                                                                                                                                           |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Docker login, build or push           | Docker Hub or a build hiccup; nothing reached `main` or the cluster.                                              | Re-run the failed run. CI built the same code, so suspect Docker Hub or the network before the code.                                                         |
| Commit the digest and sitemaps        | Someone changed the `image:` line on `main` meanwhile, so the rebase conflicted. Nothing was deployed.            | Find what changed the manifest, fix it on `main`, then re-run.                                                                                               |
| Wait for Flux: `failure` or `error`   | Flux applied the commit, but the new pods weren't healthy within its 5-minute timeout. The old pods keep serving. | Read the Discord alert and `kubectl -n osrs-tracker describe deploy osrs-tracker-web`. Roll back (above) unless the fix is quick.                            |
| Wait for Flux: no status after 10 min | Flux didn't sync (it polls `main` every minute): the GitRepository can't fetch, or Flux isn't running.            | Check the `osrs-tracker-web` GitRepository and Kustomization with the flux MCP. Once it reports success the site is fine; re-run only to get the smoke test. |
| Smoke test the site                   | The new pods serve, but `/`, its `main-*.js`, `/about/terms` or the 404 page answered wrong.                      | Roll back first, then look: no `x-cache` means the auto-generator couldn't render `/`; a 404 on the bundle means the image's assets don't match.             |

If Flux says "forbidden", the manifest uses a kind Flux isn't allowed to manage yet: that's fixed in
FreekMencke/home-cluster's `cluster/osrs-tracker/flux.yaml`, not here.

## Site down or erroring

- **Every page 5xx, pods restarting:** `kubectl -n osrs-tracker get pods`; `describe pod` shows `OOMKilled` (the 512Mi
  limit) or a failing probe, and the logs show crashes. If it started with a deploy, roll back.
- **429 Too Many Requests:** Traefik's per-client limits in `osrs-tracker-web.yaml` (50 requests/s average, burst 250,
  200 in flight). Expected for an aggressive crawler; if real visitors hit it, raise them there and merge to `main`.
- **Player or item pages 503 while the pods are healthy:** an upstream is down, see "Known upstream failures" below.
- **Certificate errors:** cert-manager renews `osrs-tracker-web-tls`
  (`kubectl -n osrs-tracker describe certificate osrs-tracker-web-tls`); issuer problems are fixed in
  FreekMencke/home-cluster.

## Look around

The `kubectl` commands use the `kubernetes-admin@kubernetes` context. Claude Code sessions read through the read-only
`kubernetes` and `flux` MCP servers instead; writes such as a rollout restart are for the user to run.

- Pods and events: `kubectl -n osrs-tracker get pods` and `kubectl -n osrs-tracker describe deploy osrs-tracker-web`.
- Logs: `kubectl -n osrs-tracker logs deploy/osrs-tracker-web --since=15m`, or Loki in Grafana (grafana.freekmencke.com)
  for older logs. The server's own lines are JSON with a `type`, written by `@osrs-tracker/logger`
  (`src/server/utils/log.ts` adds `prerender`): `incoming` (requests it answered), `outgoing` (requests a render made),
  `lifecycle` (startup, shutdown), `prerender` (auto page generation) and `uncaught` (errors that reached Express' error
  handler, stack in `error`); Angular's own output is plain text. Pick one with `| json | type="…"`, e.g.
  `{namespace="osrs-tracker", app="osrs-tracker-web"} | json | type="uncaught"`.
- Requests: `incoming` lines have `status`, `route` and `cache`; a client that gave up before the response is a `warn`
  with `aborted: true` and no `status` (`… | json | type="incoming" | aborted="true"`).
- Slow pages: `outgoing` lines have the `url`, `responseTime` and the `page` the render was for; a call cut short
  because the client closed the connection is `aborted: true`
  (`… | json | type="outgoing" |~ "\"responseTime\":\"[0-9]{4,}"` for calls of a second or more).
- Metrics: "Express Dashboard" in Grafana (request rate, status codes and latency per route label), defined in
  FreekMencke/home-cluster's `cluster/monitoring/grafana/dashboards/express-dashboard.json`. The series come from
  `@osrs-tracker/express-metrics` (osrs-tracker-aws, shared with the API) on the metrics port (9090, `/metrics`):
  `http_request_duration_seconds` and `up`, plus Node's `nodejs_*` and `process_*` (heap, event-loop lag, resident
  memory) for Prometheus queries; the dashboard doesn't chart those.
- Resources: `kubectl -n osrs-tracker top pods`. The pods request 50m CPU and 128Mi memory, with a 512Mi memory limit
  (no CPU limit). A pod that hits the limit is `OOMKilled` (see `describe pod`).

## Health checks

- Readiness and startup: `GET /healthy` on the app port (8080). A pod failing it is taken out of the service. It answers
  503 until the auto-generated pages are pre-rendered (at most 20 s, `readyTimeout`), so a new pod serves them from the
  page cache from its first request.
- Liveness: `GET /healthy` on the metrics port (9090). Failing it restarts the pod.
- On shutdown, a 5 s `preStop` delay keeps the pod serving until Traefik has dropped it, then the server closes its
  connections (forced after 10 s) and the metrics server closes last. A PodDisruptionBudget keeps at least one of the
  two pods up during node maintenance.

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

Server-side rendering reaches the API inside the cluster (`API_INTERNAL_URL` in `osrs-tracker-web.yaml`, the API's
Service on port 3000), not through its public URL. If pages fail to render while the public API answers, check that
Service and the variable: `kubectl -n osrs-tracker get svc osrs-tracker-api-service`.
