# Decisions

Choices that look like accidents without their context: what was decided, why, and when to revisit. Newest first.

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
  `express.static`. No redirect to the root path (with the 30-day cache a stale bundle name would get the wrong file),
  no absolute asset URLs (`deployUrl` is deprecated), no blocking the crawler (it indexes real pages fine).
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
