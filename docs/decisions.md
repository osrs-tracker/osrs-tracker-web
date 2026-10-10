# Decisions

Choices that look like accidents without their context: what was decided, why, and when to revisit. Newest first.

## Sitemaps are generated once per deploy, and keep the last good file (2026/10/10)

- **Context:** the items and players sitemaps list what the OSRS Wiki and the API return at build time. The Docker build
  ran `prebuild` and fetched both again, so the image could serve other sitemaps than the ones `CD` commits, and a
  failed fetch failed the build.
- **Decision:** `CD` runs `npm run sitemap` once; the Dockerfile builds with `--ignore-scripts` (then runs `postbuild`)
  and serves those files. A failed, non-2xx or empty fetch keeps the committed file with a warning and exits 0
  (`fetchList` in `scripts/sitemap/sitemap-file.js`), so a hiccup costs one deploy's freshness, not the deploy. Players
  come from the API's `GET /sitemap/players` (tracked, not paused, with an entry in the last 30 days), at their
  canonical lower-case name, dated by their newest entry. No `<priority>` or `<changefreq>`: Google ignores both. A
  commit that changes only sitemaps still skips the deploy (`NOT_IN_IMAGE` in `deploy.yml`): the next deploy regenerates
  them anyway.
- **Revisit:** if a sitemap passes 50,000 URLs (the players one had 534 on 2026/10/10), or a source goes stale often
  enough that keeping the old file hides it.

## Server logs are JSON with a type (2026/10/09)

- **Context:** the request log was JSON, everything else plain text, and errors spread their stack over many lines,
  which Loki stores as separate entries. Logging the requests renders make, in the request log's shape, made the two
  hard to tell apart.
- **Decision:** every line the server writes is one JSON object with `level`, `time` and a `type` (`incoming`,
  `outgoing`, `lifecycle`, `uncaught`, plus `prerender` from `server/utils/log.ts`), errors with their stack in `error`.
  The lines, the request log and the `outgoing` log come from `@osrs-tracker/logger` (pino, in `osrs-tracker-aws`),
  shared with the API so both write the same shape; morgan is gone. Angular's own console output, and the app's
  `console.error`s (which also run in the browser), stay plain text.
- **Revisit:** if the API's logs should be queried together with these: they're the same shape and both have `type`.

## Item pages load the price history in the browser (2026/10/09)

- **Context:** item pages took 1 s at the median and 10 s at the 90th percentile (crawlers give up at 10 s) while the
  API answered in under 100 ms: SSR waited for three OSRS Wiki calls without a timeout, one of them the 1h time series
  (about 40 KB, embedded in every page). The slowness came and went by time of day, independent of our traffic.
- **Decision:** the time series loads in the browser only (the chart already did), with skeletons on the server for the
  volume and yesterday's change. The small `latest` calls stay in SSR, so crawlers still see prices, without a timeout
  for now (a timeout just for the Wiki was too specific for what the logs may show); a failed price load renders as
  loading on the server, as the browser fetches it again after hydration. The server logs every request a render makes
  with its duration and page (`type: "outgoing"`, `logOutgoingRequests` from `@osrs-tracker/logger`): from undici's
  `diagnostics_channel` rather than an Angular interceptor, so it sees every `fetch` and lives with the rest of the
  server's logging.
- **Update (2026/10/09):** in the first 45 minutes after the deploy, 3 of 20 item page renders still waited 3.4 s, 7.4 s
  and 14.8 s for a `latest` call. OSRS Wiki requests now carry the `SSR_TIMEOUT` context token, and during SSR
  `ssrTimeoutInterceptor` gives those Angular's own request `timeout` of `ssrRequestTimeout` (3 s, `server-config.ts`),
  which aborts the `fetch` (an `aborted` `outgoing` line, `responseTime` about 3 s) and fails the request. An item page
  then shows the prices as loading and the browser loads them. Opt-in, not for every request: a general timeout also
  turned a slow API or GitHub call into the error page (resolvers), a load-error box (player history, Home's news,
  cached for 5 minutes) or a bare 404 (the changelog's resolver has no error handler), while only the Wiki was ever
  slow. Crawlers that hit a timeout see no prices in that page's HTML.
- **Revisit:** if timeouts (`aborted` `outgoing` lines) are frequent, load the `latest` calls in the browser too.

## Traefik compresses responses, the server sets cache lifetimes (2026/10/09)

- **Context:** the `compression` middleware compressed every response in the pod (brotli quality 4), using the CPU SSR
  renders need. Every static file got a 30-day cache, unhashed icons and sitemaps included.
- **Decision:** the `osrs-tracker-web-compress` Middleware in `osrs-tracker-web.yaml` compresses text types, last in the
  Ingress's chain, like the API's. Brotli is preferred (`encodings: [br, gzip]`): browsers don't weight their encodings,
  and Traefik's default order gave them all gzip; its zstd came out larger than both. Images and the font are left
  alone. Locally nothing is compressed. `middleware/static-files.ts` caches hashed bundles (`.js`/`.css` at the root)
  for a year (`immutable`), revalidates `noCacheStaticFiles` (manifest, robots, sitemaps) on every use, and caches the
  rest for a day. Not compressed at build time: a better ratio, but more build and server code than the traffic is
  worth.
- **Revisit:** if Traefik's CPU use matters, or for pre-compressed static files at higher traffic.

## The server's connections outlive Traefik's (2026/10/09)

- **Context:** Traefik keeps idle connections to the pods for 90 s, Node closes them after 5 s, so Node can close one
  just as Traefik sends a request on it (a 502).
- **Decision:** `keepAliveTimeout` is 95 s (`server-config.ts`). On shutdown, `utils/shutdown.ts` closes connections as
  they become idle, otherwise a connection still sending a response would keep the server open until the forced exit.
  The metrics server closes only after the main one, so liveness keeps answering while it drains.
- **Revisit:** if Traefik's `serversTransport` idle timeout changes.

## Keyboard patterns come from `@angular/aria` (2026/10/09)

- **Context:** `segmented` was a row of toggle buttons, one Tab stop each. Radio groups, comboboxes and grids need
  roving focus and arrow keys, which are easy to get subtly wrong by hand.
- **Decision:** use `@angular/aria` (headless directives, no styles) for keyboard patterns, starting with `segmented` on
  its toolbar (`Toolbar` and `ToolbarWidgetGroup` as host directives, `role="radiogroup"` on the host overriding the
  toolbar's role). Arrow keys only move focus; Enter or Space chooses, so arrowing through periods doesn't fetch each
  one. The package pins `@angular/cdk` to its exact version, so `ng update @angular/cdk` updates both, and all
  `@angular/*` packages stay on the same patch. It adds about 4.5 KB gzipped of JavaScript, in a chunk shared by the
  pages that use it.
- **Initial Tab stop:** the toolbar makes its first option the Tab stop and has no public API to change it, so
  `segmented` sets the toolbar's active item to the checked option through its `_pattern` while focus is outside (and to
  the focused one on `focusin`). It runs as an `effect`, so it also runs during SSR and the server HTML has the Tab stop
  before hydration. Every `_pattern` use lives in `common/ui/controls/aria-tab-stop.ts`: recheck that file on every
  `@angular/aria` update.
- **Disabled options** stay soft-disabled (the toolbar's default, `aria-disabled` instead of `disabled`): the arrow keys
  reach them, so keyboard and screen reader users find them and their reason, and the click handler ignores them.
- **Item search** is a combobox (`ngCombobox` on the input, a `ngListbox` popup with `activedescendant` focus). Its
  options are the result `<a routerLink>` elements themselves (`ngOption` gives them `role="option"`), not links inside
  options: mouse users keep middle-click, Ctrl-click and "Open in new tab", and a plain Enter opens the active option
  through the router. Enter searches instead when the input changed since the results and the arrow keys haven't moved
  since, so typing a new name and pressing Enter still searches. The popup cancels `mousedown`, so focus stays in the
  input and its `focusout` doesn't close the list before a click lands (on Retry, or on text in the list); a
  `pointerdown` outside closes it, also when focus was never in the input (the Search button, `?q=`).
- **Hiscores grids and chart legend:** the grids use aria's grid (`ngGrid` rows of three, each cell a `ngGridCellWidget`
  button that keeps `aria-pressed`, so aria's own selection isn't used), the legend its toolbar. The total level is the
  skill grid's last row, one cell spanning it, as it's charted like the skills; the clue total is outside the grid, as
  it isn't a cell to pick. Aria sets the grid's and toolbar's first Tab stop in an `afterRenderEffect` (never on the
  server), so from an `effect` the grids call the grid's `_pattern.setDefaultStateEffect()` (a no-op once the grid has
  been used), and the legend the toolbar's `_pattern.setDefaultState()` whenever its Tab stop is missing, as the toolbar
  also keeps a removed chip as its Tab stop, leaving none. When the focused chip is the one removed, the legend moves
  focus to its new Tab stop, rather than letting it fall back to the page. `hiscores-grids.spec.ts` guards both. Every
  `[tooltip]` opens on keyboard focus (`:focus-visible` only, so a click doesn't) and closes on Escape, as arrowing
  through the grid is how keyboard users read XP and ranks; hover and focus each keep it open, so leaving one doesn't
  close it while the other remains.
- **Revisit:** when `@angular/aria` gets a radio group or an API for the initial active item; drop `aria-tab-stop.ts`
  then.

## Sitemap dates come from git (2026/10/09)

- **Context:** `<lastmod>` came from file timestamps, which a fresh checkout (the `CD` workflow) sets to the checkout
  time, so every deploy moved every date and search engines learn to ignore them.
- **Decision:** `sitemap-site.js` takes each page's date from the last commit that changed its source file (the template
  for privacy and terms, `CHANGELOG.md`), following renames, which don't count as a change. Without full history (a
  shallow clone, or the Docker build, which has no git or `.git`) it keeps `public/sitemap-site.xml` as it is: the image
  is built from the file the `CD` workflow just generated. The sitemap index dates each sitemap by the day its content
  last changed (`sitemap-index.js`): today when the run changed it, else its last commit, in UTC. A day, not a time:
  `CD` commits a few minutes after generating, so a time would change again on the next deploy. Item pages have no date
  of their own (Wiki item list has none, the API's `lastFetch` is the last lookup).
- **Revisit:** if a page's content stops living in one file (e.g. it moves to the API or a CMS).

## Live hiscores load in the browser only (2026/10/08)

- **Context:** the player page renders on the server with the stored history, then fetches the live hiscores (through
  the `runescape-api` proxy) in the browser for today's gains, so the page changes a moment after it loads.
- **Decision:** keep the live fetch out of SSR. The proxy is shared with the API and the daily scrape, so rendering it
  on the server would call Jagex for every render, crawlers included, and make each render wait on Jagex (it was moved
  to the browser on 2025/04/24 for that). Instead, nothing jumps when it arrives: today's day-log card is a skeleton
  until then (also in the SSR HTML), the header only says "Last checked …" when the stored stats are what's shown, and
  `BaseChart` keeps drawn datasets over the same dates so only the newest point moves.
- **Revisit:** if the proxy gets its own rate limit headroom, or the API starts storing intraday stats.

## Phone layout for Home and the lists (2026/10/08)

- **Context:** on phones, Home's four news cards stacked as full-width image cards (about 1,500px of scrolling before
  the tracker lists), and list rows were sized for desktop.
- **Decision:** below `sm`, the news is a 2×2 grid of the same picture-on-top cards, the picture uncropped, the title
  first and a one-line "7 Oct · Category". Tried in the design canvas and rejected: cropped thumbnails, a small
  thumbnail beside the text (a wrapping title leaves it floating), a lead story with rows, and a sideways swipe row (it
  broke the page margins). List rows drop to one line: no total level, the item price beside the change.
- **Revisit:** if the news gets more than four items, or the lists need the total level back on phones.

## Missing asset paths get a plain 404 (2026/10/08)

- **Context:** some crawlers (OAI-SearchBot) ignore `<base href="/">` and request `/trackers/price/chunk-*.js`. Those
  paths matched the item and player routes, so each one cost a full render and an API call with the filename as id.
- **Decision:** `middleware/missing-asset.ts` answers paths ending in a build asset extension with a 404 after
  `express.static`. No redirect to the root path (browsers cache the redirect, so a stale bundle name could keep
  pointing at the wrong file), no absolute asset URLs (`deployUrl` is deprecated), no blocking the crawler (it indexes
  real pages fine).
- **Revisit:** if a route ever needs to end in one of those extensions.

## Server-side rendering calls the API inside the cluster (2026/10/08)

- **Context:** SSR called the API through its public URL, so every call left the cluster and came back in through the
  router, Traefik's rate limit and the CrowdSec bouncer.
- **Decision:** with `API_INTERNAL_URL` set, the server uses the API's Service address; the browser keeps the public
  URL. The transfer cache maps the internal origin back to the public one, so cached responses still reach the browser.
  The API then sees the web pod as the client (no forwarded visitor IP).
- **Revisit:** if the API moves out of the cluster or behind a different Service.

## Deploys go through GitHub Actions and Flux (2026/10/08)

- **Context:** deploying needed Docker Desktop, a manual digest edit and `kubectl apply` from a laptop.
- **Decision:** merging to `main` deploys. The `CD` workflow builds the image and commits its digest with a deploy key
  (the only bypass of `main`'s PR rule); Flux in the cluster applies it, so GitHub has no cluster access. Commits that
  don't change the image skip the build, digest commits don't run CI, and the smoke test checks the web app only, not
  the API, so an API outage can't fail a good web deploy.
- **Revisit:** if deploys need an approval step, or a second environment appears.

## Aborted requests are warnings (2026/10/08)

- **Context:** a client that disconnects before the response has no status, and the logger counted it as a 500. Crawler
  aborts dominated the error count and would hide a real 500.
- **Decision:** log them as `warn` with `aborted: true` and the time until the disconnect, the same shape as the API.
  Not `info` and not dropped: they're the only sign that slow SSR pages make visitors give up.
- **Revisit:** if aborts stay high on one route; then that page's render time needs work.

## Semantic colour tokens instead of `dark:` pairs (2026/10/07)

- **Context:** the redesign ([#78](https://github.com/osrs-tracker/osrs-tracker-web/issues/78)) has 18 colours per
  theme. Writing each as a `slate-*` class with a `dark:` partner doubled the classes in every template and let the two
  themes drift apart.
- **Decision:** Tailwind tokens (`bg-card`, `text-muted`, `border-line`, `text-up`…) backed by CSS variables that swap
  under `.dark` in `base.css`. Templates match the design canvas one to one and stay Tailwind-only (no arbitrary
  values). The extra slate steps and the true green behind them live in `theme.css`; every other colour is Tailwind's
  own.
- **Revisit:** if a third theme is added (it's one more variable block), or a component needs a colour that isn't a
  token: add a token rather than a one-off.

## Features dropped in the redesign (2026/10/07)

- **Context:** the redesign was a chance to remove things that cost more than they gave.
- **Decision:**
  - **Price "Trend" card:** the item page's 1Y price range shows the same trend with real data.
  - **X/Twitter link:** removed from the nav, which now holds only the three pages and the theme toggle; GitHub moved to
    the footer.
  - **Hamburger menu:** with three destinations it only hid them. Phones get a row of three tabs under the logo, and the
    nav is sticky from `sm` up only, as the two-row phone nav is too tall to pin.
  - **Sparklines in item lists:** a price history per row would need a heavy backend call per item; the chart stays on
    the item page.
  - **Spinners:** loading shows skeletons sized like the content, so pages don't jump when data arrives.
- **Revisit:** a fourth top-level page (the tab row fits three), or a cheap bulk price-history endpoint (sparklines).

## Item page volumes and averages come from the hourly series (2026/10/07)

- **Context:** the item page needs yesterday's 24-hour average (for the change in its header), the volume over the last
  24 hours and 14 days of daily volumes. The Wiki's `/24h` and `/volumes` endpoints return every item (about 390KB and
  50KB), and SSR would embed them in the page's transfer state. Its `24h` time series lags a day or two behind.
- **Decision:** derive all three from the item's `1h` time series (365 hours), which the page loads anyway for the 1W
  price range: volume-weighted per UTC day, which matches `/24h` exactly. The item lists still use `/24h` (in the
  browser, shared between rows).
- **Revisit:** if the Wiki shortens the `1h` series below 15 days, or the numbers drift from the lists.

## GE tax rules are hard-coded (2026/10/07)

- **Context:** "Margin after tax" and the profit calculator need the Grand Exchange tax: 2% of the sale price, rounded
  down, capped at 5M per item, with a list of exempt items. No API publishes these rules, and Jagex changes them in
  unpolled game-integrity updates (1% to 2% in May 2025, edits to the sink and exempt lists).
- **Decision:** keep the rate, cap and exempt item ids in one helper,
  `features/trackers/price-tracker/item-detail/ge-tax.ts`, which links the
  [Wiki section](https://oldschool.runescape.wiki/w/Grand_Exchange#Convenience_fee_and_item_sink) and says when it was
  last checked.
- **Revisit:** check the Wiki section when a GE or game-integrity update ships; a monthly workflow runs
  `npm run check:ge-tax`, which compares the helper with the Wiki (steps in `docs/runbook.md`). Update the helper's
  "last checked" date each time.

## Per-request CSP nonce for inline scripts (2026/10/04)

- **Context:** the CSP allowed `'unsafe-inline'` scripts. Angular SSR adds its own inline scripts (event replay,
  critical CSS) besides ours (gtag, theme), so a static hash list isn't practical.
- **Decision:** a nonce per response (`middleware/csp-nonce.ts`). `index.html` sets
  `ngCspNonce="CSP_NONCE_PLACEHOLDER"`, Angular copies it onto every inline script, and `applyCspNonce` swaps in the
  real nonce for rendered and cached pages. Inline event handlers are blocked (`script-src-attr 'none'`).
- **Revisit:** any new path that serves HTML must call `applyCspNonce`, or its scripts won't run.

## Every replica pre-renders its own pages (2026/10/04)

- **Context:** each pod's auto-generator renders and refreshes `serverConfig.autoGeneratedPages` on its own timers. With
  2 replicas that doubles upstream calls, and pods can serve slightly different versions of `/` for up to 5 minutes.
- **Decision:** accept it. The cost is negligible, and a shared cache would add a moving part (e.g. Redis).
- **Revisit:** above 2 replicas, or if the auto-generated page list grows a lot.

## Production-only configuration (2026/10/04)

- **Context:** `src/config/config.ts` points at the production API, hiscores proxy and wiki prices, with no development
  or staging variant. The API's CORS allows only `http://localhost:4200`, so local runs use that port.
- **Decision:** stay production-only. A separate environment is overkill for a single-maintainer hobby project that only
  reads public data.
- **Revisit:** if local work needs to write data, or a change must be tested against an unreleased API.

## Changelog is written for users (2026/10/04)

- **Context:** `CHANGELOG.md` is rendered on `/about/changelog`, yet every change (dependencies, tooling, server
  hardening) gets an entry.
- **Decision:** write entries for users. Busy days are grouped under `###` subtitles, with invisible changes last under
  "Behind the scenes".
- **Revisit:** if the changelog page gets noisy.
