---
name: osrs-tracker-web
description:
  Angular 22 SSR conventions, the SSR transfer-cache and page-cache pitfalls, local runs, the GitHub Actions + Flux
  deploy and the commit rules for osrs-tracker-web. Use when writing or reviewing code in this repo, debugging data that
  refetches or flashes after load, running it locally, or building, deploying, committing, pushing, releasing or
  shipping it.
---

# osrs-tracker-web

Detailed guide; the always-on summary, commands and hard rules are in `CLAUDE.md` and aren't repeated here. Deliberate
trade-offs in `docs/decisions.md` include production-only config, per-replica pre-rendering and the CSP nonce. The
`conventions-reviewer` agent reviews diffs against this file, `angular-conventions` and `CLAUDE.md` at runtime, so keep
code rules in them, not in the agent; repo-specific review rules go in `## Review rules`.

General Angular rules (templates, imports and layers, stores, failures, routes and meta, SSR, tests, Tailwind) are in
the `angular-conventions` skill, on top of Angular's `angular-developer`: load both. This skill holds this repo's
specifics and examples, and wins where they differ. Without `angular-conventions` (cloud sessions don't load personal
skills), say so instead of guessing its rules.

## Related repos

`~/repos/osrs-tracker-api`, `~/repos/osrs-tracker-aws` and `~/repos/osrs-tracker-packages` (the `@osrs-tracker/*` npm
packages) have their own skills (`../` from the main checkout, not from a worktree).

- `src/config/config.ts` (production only): `apiBaseUrl` is the API, called during SSR, so its `Cache-Control` matters.
  `awsBaseUrl` is the API Gateway hiscores proxy, browser only; the API and a Lambda share it, so check changes in all
  three repos.
- In the cluster, SSR calls the API at `API_INTERNAL_URL` (the API Service, set in `osrs-tracker-web.yaml`), not the
  public URL: `provideInternalApiBaseUrl` in `core/interceptors/base-url-interceptor.ts` swaps the base URL on the
  server and maps that origin back to `apiBaseUrl` for the transfer cache (`HTTP_TRANSFER_CACHE_ORIGIN_MAP`), so the
  browser still finds the responses. Unset locally. URLs that end up in the HTML (the news `<img>`) use
  `config.apiBaseUrl` directly and stay public.
- `@osrs-tracker/hiscores` peer-depends on `@osrs-tracker/models`: bump both together, with `--prefer-online` right
  after a publish.
- Production test players: **the fraking** (active) for visual checks, **ToxSick** (inactive) for anything that writes.
- The GE tax rules in `item-detail/ge-tax.ts` are copied from the OSRS Wiki: `npm run check:ge-tax` compares them
  (monthly in CI), and "Recheck the GE tax rules" in `docs/runbook.md` says what to fix.

## Angular conventions

- **Imports**: relative within a feature or a folder of `common/` or `core/` (and from the root `app.*` files into their
  subfolders); `@app/…`, `@config/…` or `@server/…` otherwise. In the layers (`eslint.config.js`), `common/` and `core/`
  are the shared code, Home may import the trackers, and `common/api/` is the repository layer.
- **DI**: `inject()` only; root services use `@Service()`, not `@Injectable({ providedIn: 'root' })`.
- **Markup**: bind fetched or user-supplied HTML with `[innerHTML]` (Angular sanitizes it, as the news cards do); never
  `bypassSecurityTrust*` or write `nativeElement.innerHTML` to make what it strips render.
- **State**: the stores include `XpTrackerStore`, `PriceTrackerStore`, `LastPlayedStore` and `ThemeStore`.
- **Async data**: pages after a list's first one ("Show older posts") load through `paging()` (`common/paging/`). A
  `resource`/`rxResource` loads again whenever a signal its `params` reads changes, even when the params come out the
  same (Angular 22 wraps them in a new object each time): put a condition that can flip without changing them in its own
  `computed`, as `listsNeeded` in `price-tracker/tables/price-table-page.ts` does.
- **Failures**: `value()` throws in the error state, so check `error()` (or `hasValue()`) first and render
  `<load-error source="…" (retry)="resource.reload()" />`: `compact` when it replaces a single value in a row or widget,
  `inline` (amber text, a short message) when it replaces a line under a value, the default when it replaces a list or
  section, `panel` for a panel.
- **Keyboard patterns**: use `@angular/aria` (headless) for toolbars, listboxes, comboboxes and grids instead of
  hand-written arrow-key handling; style its state with `aria-*:` variants (`aria-disabled:`, `aria-checked:`).
  `segmented` shows the pattern and its SSR caveat (`docs/decisions.md`).
- **HTTP**: repositories use the `BASE_URL_PREFIX` / `LOADING_INDICATOR` `HttpContext` tokens, not absolute URLs, and
  `SSR_TIMEOUT` on third-party calls (see Third-party calls in SSR).
- **Routing**: titles are `'<Page> - OSRS Tracker'`, or `'OSRS XP Tracker: Daily gains, …'` on a landing page; resolvers
  end with `catchError(resolverErrorHandler(<original url>))`. `ParamAwareReuseStrategy` recreates components on param
  change. Adding or renaming a route means updating `src/server/utils/route-label.ts` (its spec fails CI otherwise).
- **Page meta**: `PageMetaStrategy` (`common/seo/`) sets it from `data['meta']`, a `RouteMeta`: a `PageMeta`, or a
  function of the route that builds one from its resolved data and params (`itemDetailMeta`). The meta's `title` wins
  over the route's `title`, which then only names the page without meta (a not-found state). A route without meta gets
  the default description and no canonical or social tags.

## Design system

Built from the [OSRS Tracker Design canvas](https://claude.ai/artifact/SptGtqgrh6RE8cVzLJJhom) (read it with the
Artifact tool); why it looks like this is in `docs/decisions.md`. Try layout ideas there first and let the user look.
The Artifact tool reads its source but can't render it, nor can Playwright (sign-in), so ask the user for a screenshot.
Each page row has artboards at 1440, 1100, 820, 390 and 320px; the narrower ones import the 1440 one; component
artboards are 640px wide with a Layout tweak (auto, desktop, phone); states such as hiscores down are tweaks, not extra
artboards. A component's `<helmet>` styles apply on every artboard that imports it, so the colour tokens, the font, the
Tailwind basics and the `.ui-select` classes live once in its `Tokens` component, which every page and component imports
(wrappers get it through their page): change a token there, and mirror it on the Theme board. Tailwind classes only; a
value the scale lacks becomes a token in `src/styles/tailwind/theme.css`.

- **Colours** (`base.css`): `ground` page, `card`, `line` dividers, `row` row lines and hover, `inner` inner tiles,
  `deep` hero band and icon tiles, `border` controls, `muted`/`text`/`strong` text, `accent` (+ `accent-hover`,
  `on-accent`) links and primary actions, `up`/`down` changes (a true green in the dark theme, apart from the emerald
  accent), `down-pill` the red change pill's background (a tint in light, solid in dark: a see-through red over slate
  turns pink), `amber` warnings, `sold` the volume chart's sold bars, `scrim` the see-through layer behind the phone
  nav's menu sheet, `dot` the hero's dot grid (`.dot-grid` in `utilities.css`). Charts read them through `token()` in
  `chart-setup.ts`, which lists the ones they use. Tailwind's stock palette is off (`--color-*: initial` in
  `theme.css`): `bg-slate-800`, `text-orange-500` and `text-white` build to nothing; only these tokens and
  `transparent`/`current`/`inherit` remain. A new colour is a token in `base.css`, built from a `--palette-*` step in
  `theme.css` (add the step there if it's missing).
- **Tints:** `hiscores/picked-cell.ts` and the chart legend layer one over the surface.
- **Surfaces:** cards are flat; only floating layers (dropdowns, tooltips, Home's preview card) get `shadow-float`.
- **Radii:** `rounded-3xl` hero surfaces (search box, preview card), `rounded-2xl` cards, stat tiles and buttons in the
  search box, `rounded-xl` inner tiles, inputs and icon tiles, `rounded-full` pills and standalone buttons.
- **Type:** Tailwind's `text-xs`…`text-6xl`, line heights like `text-xl/6`. Page titles `text-2xl sm:text-3xl`, landing
  heroes `text-4xl md:text-5xl` (Home up to `lg:text-6xl`), card titles `text-xl`. Standalone values (`tabular-nums`):
  prices, XP, levels, tiles, axes.
- **Spacing:** steps of 4, 8, 12, 16, 24, 32, 48, 72px; card padding 20px (`px-5`). 24px between cards and sections,
  16px between stat tiles; pages `max-w-page mx-auto px-4 sm:px-6`, 48px from the nav or a hero band (`pt-12`) and 72px
  above the footer (`pb-18`); reading pages narrow to `max-w-3xl`.
- **Phones** (below `sm`): keep pages symmetric inside the 16px margins and check balance against the cards around a
  change. Pictures are never cropped (Home's news is a 2×2 grid of picture-on-top cards; tablets show four of them in a
  row, the `compact:` variant). List rows are one line: no second line, 40px tiles as on desktop, 16px names, the item
  price beside the change pill.
- **Icons:** every line icon is Lucide's, through `@lucide/angular` (`docs/decisions.md`): import the icon's component
  (`LucideSearch`) and write `<svg lucideSearch class="size-4.5" strokeWidth="2.5" />`; pick from
  https://lucide.dev/icons, never hand-draw one or take it from another set. Weight with `strokeWidth` (a `stroke-width`
  attribute is overwritten): 2 by default, 2.5 beside bold text (buttons, nav tabs, back links). Size and colour with
  classes (`size-*`, `text-*`, `stroke-*`), changing ones in one `[class]="…"` binding, never `[class.x]`: the component
  rewrites its `class` attribute on creation and drops a `[class.x]` that's already true (`[class]` feeds its `class`
  input instead); `[attr.fill]="'currentColor'"` fills one (the favourites star). When the icon varies, bind a component
  class to `svg[lucideIcon]` (`LucideDynamicIcon`, as in `status-panel`). Icons are `aria-hidden`: label the control
  around them. `img[icon]` is for the game's pixel-art icons.
- **Classes** (`components.css`): `.button--primary` (accent) and `.button--default` (outlined), `.button--rounded` for
  standalone ones; `.link` for accent links; `.link-pill` with `.button--default.button--rounded` for the shortcuts
  under the item search (a 36px pill on `card`, so the dot grid stays out of its text);
  `.search-box`/`.search-box-input`/`.search-box-button` for the big search; `.markdown` for reading text (changelog,
  privacy, terms).

Which component to use (in `common/ui/<folder>/` unless noted):

| Need                                                          | Use                                                                                     |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| A titled section (`cards/`)                                   | `article[card]`: 56px header, `[title]` and `[actions]` slots, `subtitle` for two lines |
| A list of players or items (`cards/`)                         | `section[list-card]` with its loading, empty and error states; `list-row-skeleton` rows |
| One headline number (`cards/`)                                | `stat-tile` (`compact` for six in a row, `loading`, `tone` for a change)                |
| A choice of views or periods (`controls/`)                    | `segmented` (32px pills, a radio group; `variant="slate"` beside an accent button)      |
| The tracking offset                                           | `tracking-offset` (`features/trackers/xp-tracker/`; a 32px select, stored per device)   |
| A whole page's state: not found, unavailable, error (`page/`) | `status-panel`, with `back-button` or other actions as content                          |
| Something failed to load (`loading/`)                         | `load-error` (default, `panel`, `compact` or `inline`; see Failures above)              |
| Something is loading (`loading/`)                             | `skeleton` blocks sized like the content, never a spinner                               |
| A chart's values as a table (`common/charts/`)                | `chart-table` behind a `chart-display-switch` (see Chart.js in SSR rules)               |
| A short explanation (`tooltip/`)                              | `info-tooltip`, or `[tooltip]` on any element                                           |
| A reading page (`page/`)                                      | `information-page` around `<div class="markdown">`                                      |
| A line icon                                                   | a Lucide component, `<svg lucideSearch />` (see Icons above)                            |

## Code navigation

Grep the templates like `grep -rn "(retry)=" src/app`. The `LSP` tool's go-to-definition doesn't reach `node_modules`;
hover shows library signatures and docs instead.

## SSR rules

- **Browser-only APIs**: inject `WINDOW` (null on the server) or `StorageService`, check `isPlatformBrowser`, or use
  `@defer` with a `@placeholder`.
- **CSP**: a path that sends page HTML sets the nonce with `applyCspNonce`.
- **Response status**: `inject(RESPONSE_INIT, { optional: true })`, not an Express `RESPONSE` token.
- **Transfer cache**: in `<script id="ng-state">`, look for a news title or an item name.
- **Transfer state size**: the browser alone loads the Wiki's `/latest` and `/24h` and every item's prices, and item and
  player rows render skeletons on the server. The Wiki's `/latest` is the exception: the server keeps the full list for
  60 s and transfers only the rendered items' entries (`getLatestPrices` in `osrs-prices-repo.ts`). Don't ask the Wiki
  for one item (`?id=`): it misses the Wiki's CDN cache (`docs/decisions.md`).
- **Third-party calls in SSR** (the OSRS Wiki): `latestLoading` in `item-detail.ts` renders a failed one as loading. Set
  the `SSR_TIMEOUT` context token on such calls (`core/interceptors/ssr-timeout-interceptor.ts`): during SSR they fail
  after `ssrRequestTimeout` (3 s). `logOutgoingRequests` logs every request a render makes, with its duration and the
  page `renderingPage()` (`server/utils/log.ts`) set (undici's `diagnostics_channel`, so it sees every `fetch`).
- **Server logs**: request logs match the API's shape: 5xx `error`, 4xx `warn`, else `info`; a client that disconnects
  before the response is `warn` with `aborted: true` and no `status`. Both come from `@osrs-tracker/logger` (in
  `osrs-tracker-packages`; change the shape there, for both apps). Every server log line is JSON with a `type`: write
  new ones through a child of `logger` from `src/server/utils/log.ts`
  (`logger.child({ type: 'lifecycle' satisfies WebLogType })`), not `console`, and add a type to `WebLogType` when none
  fits. Specs pass their own logger (`testing/log-lines.ts`): pino doesn't write through `process.stdout.write`, so
  spying on it sees nothing.
- **Secrets**: no token, `Authorization` header or full request body in a log line or error message: log the fields you
  need as separate properties. No hard-coded secret as a fallback (`process.env['X'] || '…'`): fail without it.
- **Writes** (lookups, starting to track a player): check `isHumanVisitor()` (`core/platform/human-visitor.ts`); a
  crawler's would fill the recent lookups.
- **Chart.js**: shared registrations and the date adapter in `common/charts/chart-setup.ts`; never `Chart.unregister`.
  Time series charts extend `common/charts/base-chart.ts`; their `setData` may build new datasets, as `BaseChart` keeps
  a drawn one in place when its label and dates match, so only changed points animate (Chart.js redraws a new object
  from the axis). Every chart's card gets a `chart-display-switch` (icon pills, beside its range or period) that shows a
  `chart-table` in the chart's place, at the chart's height, as the canvas is otherwise the only way to its values (WCAG
  1.1.1). A `BaseChart` subclass is hidden, not removed, while its table shows: it creates its chart once, on its
  canvas. Group the table's rows in the visitor's time zone with `binByTime` and `timeBinLabel`
  (`common/charts/time-bins.ts`), as `priceTableRows` (`item-prices.ts`) and Players online's history do. The volume
  card bins UTC days and months instead, as the Wiki counts its days (`binnedVolumes`).
- **Icons**: after changing `public/assets/icons/{skills,activities}`, run `npm run icons` and commit
  `local-icons.generated.ts`.
- **Font**: SOLIX comes from the private [FreekMencke/solix](https://github.com/FreekMencke/solix) releases
  (`gh release download -R FreekMencke/solix`). Cut `variable/SOLIX[wght].ttf` (`SOLIX-Variable.ttf` up to 3.03) to the
  weights the `@font-face` declares (`python3 -m fontTools.varLib.instancer 'SOLIX[wght].ttf' wght=300:700 -o cut.ttf`,
  quoted for the brackets; since 3.00 the release spans 100–900, and the full axis makes the preloaded file 62 KB
  instead of 38 KB), save it as WOFF2
  (`python3 -m fontTools.ttLib.woff2 compress cut.ttf -o public/assets/fonts/SOLIX-Variable.woff2`) and bump `?v=` in
  `base.css` and `index.html`. The link preview cards use the release's `ttf/SOLIX-Regular.ttf` and
  `ttf/SOLIX-SemiBold.ttf` as they are: copy them into `src/server/og/fonts/` and bump the cards' `?v=`
  (`docs/decisions.md`) when the release changes outlines, widths or kerning (4.0.0 changed none, so it kept them).
- **Missing assets**: `middleware/missing-asset.ts` 404s them, so Angular routes can't end in a build asset extension;
  `/og/item/:id.png` (`routers/og-images.ts`) registers before it in `app.ts`.
- **Static files and compression**: `middleware/static-files.ts` sets the cache lifetimes (hashed bundles a year,
  `noCacheStaticFiles` revalidated, the rest a day). Traefik compresses text (`osrs-tracker-web-compress` in
  `osrs-tracker-web.yaml`): don't add Express's `compression`, and add a new text content type there. The request log's
  `contentLength` is the uncompressed size. `npm run build` deletes the browser build's `index.csr.html` (SSR uses the
  copy in the server bundle; served, its scripts fail the CSP). `npx ng build` keeps it, so a local server built that
  way still serves it.
- **Page cache**: `angular-cache` serves pages pre-rendered by `AutoGenerator` (`serverConfig.autoGeneratedPages`),
  keyed by path (query ignored; `middleware/trailing-slash.ts` 301s `/path/` to `/path` first), 2xx only, refreshed on
  an interval (`/` every 5 min, the changelog hourly, How it works, privacy and terms daily). Only those pages are
  cached; every other page renders per request. After an API change, wait for the interval, or ask the user to run
  `kubectl -n osrs-tracker rollout restart deploy/osrs-tracker-web` (the MCPs are read-only; Flux leaves the restart
  annotation alone).

## Tests

- Server specs: `// @vitest-environment node`, but not `route-label.spec.ts`, which loads the app's routes. Follow
  `src/server/app.spec.ts` and `src/server/testing/serve.ts`. `tsconfig.spec.json` leaves out Node's types, which only
  come in through imports like `express` or `@angular/ssr/node`: `shutdown.spec.ts` fails alone.
- App specs: `TestBed` with `provideZonelessChangeDetection()`.

## Review rules

What `conventions-reviewer` checks beyond the rules above. It reads this section; keep repo rules here, not in the
agent.

- Read `docs/decisions.md` every review and never flag what it explains.
- Rules that span files, checked against the whole diff: a new or renamed route and `src/server/utils/route-label.ts`;
  changed icons and `local-icons.generated.ts`; a change that needs an entry under CLAUDE.md's changelog rule and
  `CHANGELOG.md`.
- **breaks** here also covers: blocks scripts under the CSP, refetches on hydration. A typical **check**: the API's
  `Cache-Control` for a new SSR request (name the endpoint and the header to verify).

## Running locally

- `npm start` (`ng serve --open`) for browser-side work; it has no auto-generator or page cache. If port 4200 is taken
  it offers another port: decline, as the API's CORS rejects any other port. Whose server holds the port and whether to
  stop it: `CLAUDE.md`.
- Server code needs the production build. `npm run build` first regenerates `public/sitemap*.xml` (the site sitemap and
  the index, dated from git; the items and players sitemaps are built by the server, `routers/sitemaps.ts`) and the
  icons, which dirties tracked files: `git restore public/sitemap*.xml` afterwards, or build with
  `npx ng build --configuration production`. Then
  `HOST=localhost PORT=4200 node dist/osrs-tracker-web/server/server.mjs`. Smoke test with
  `curl -s -D - http://localhost:4200/<path>` (unknown routes 404, generated pages `x-cache: HIT`). Stop the server you
  started with `lsof -ti:4200 -sTCP:LISTEN | xargs -r kill`.

## Browser check

For visible or request-changing work, check in the Playwright browser locally and on production after a deploy (curl
only sees server HTML). If Playwright is unavailable, say so rather than falling back to curl silently.

The `browser-checker` agent does the check, so its screenshots stay out of the main session:

1. Start the server yourself (see Running locally); for production, wait for the deploy.
2. Take the page URLs from production's sitemaps, not from the feature folders' names:
   `https://osrs-tracker.net/sitemap.xml` lists the fixed pages', items' and players' sitemaps. The paths, item ids and
   players are the same on a local server, which uses the production API. The trackers live under `/trackers/`
   (`/trackers/xp/the%20fraking`, `/trackers/price/4151`), not `/xp-tracker/…` or `/price-tracker`. Pages no sitemap
   lists (`/error`, the link-preview images) are in `src/server/utils/route-label.ts`.
3. Scan the changed pages with axe yourself, as the agent has no Bash: `npm run a11y -- <url>...` prints one line per
   WCAG 2.2 AA violation (rule, impact, selectors) and each page's `incomplete` count, and exits 1 on violations.
   `--click=<selector>` (repeatable, in order) opens a state first, such as a menu
   (`--click='[aria-controls=menu-game]'`) or a dialog; `--light` scans the light theme. Once per machine:
   `npx playwright install --only-shell chromium`. Off port 4200 the API's CORS blocks browser-side requests, so the
   scan sees their error states.
4. Delegate every round to `browser-checker` (without a `model`), hover, keyboard and width iterations too, with the
   URLs, what changed (theme, colours, phone layout, caching, the state to show, the changed elements) and the scan's
   lines. Its headless browser is apart from the session's own Playwright browser, but every `browser-checker` in a
   session shares it (two at once navigated each other's tab, 2026-10-23): run one at a time. The session's browser
   stays headed, for what the agent can't do: sites that need a sign-in, and mocking API responses
   (`browser_run_code_unsafe`).
5. Pass on the scan's violations, its `VERDICT:`, contrast failures, keyboard issues, request counts, failed requests,
   console errors and its "Not checked" list, and send its screenshots with `SendUserFile` without `Read`ing them: it
   has looked, and a `Read` puts each image back in your context. For another look, delegate again. Then delete them and
   `.playwright-mcp/`, and stop the server.

The rules it follows (it reads them here):

- Dark mode first (most visitors); light mode too for theme, colour or tint changes.
- Measure the contrast of changed text, icons and controls, and which tokens their colours are, in the page: a
  screenshot can't settle a ratio or a colour.
- A screenshot per URL and mode, and request count, failed requests and console errors. For caching, load twice and
  compare.
- Click, hover or type into controls picked from a snapshot (`browser_snapshot` refs), not ones found by guessing: a
  stray click toggles favourites or the theme in the test browser.
- Walk changed focusable parts by keyboard: Tab order, focus visible and not hidden under the sticky nav or the consent
  banner (WCAG 2.4.11), also after scrolling the next stop under the nav, Enter, Space and Escape, and focus on the new
  page's `h1` after a client-side navigation.
- Endless animations stop under reduced motion; an essential loading indicator may keep an opacity-only pulse.
- A clean scan and walk don't make a page accessible: list what wasn't checked (alt text and label meaning, reading
  order, screen-reader output, zoom and reflow).
- Close the browser as soon as the round of checks is done, even mid-task; open it again for the next one.

## Deploy

Merging to `main` is the deploy. Once CI passes on `main`, the `CD` workflow (`.github/workflows/deploy.yml`, each run
titled like the CI run that started it) builds and pushes the image (tagged `latest` and the commit SHA), then commits
its digest to `osrs-tracker-web.yaml` with the regenerated `public/sitemap*.xml` as
`chore(deploy): deploy sha256:<first 8> and update sitemaps`, pushed with the `DEPLOY_KEY` deploy key. Flux in the
cluster applies `main` within a minute and reports the commit status `Flux / sync`; the workflow waits for it (up to 10
minutes), then smoke tests the web app only, not the API: `/` (200 with `x-cache`), the `main-*.js` it loads (200),
`/about/terms` (200, rendered without API data) and an unknown path (404).

- **Skipped:** commits that change only files outside the image (`osrs-tracker-web.yaml`, sitemaps, `docs/`, `.claude/`,
  `.github/`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `LICENSE`, `.gitignore`) since the commit the last deploy was
  built from (its `Deployed-from:` trailer), and reverts of a deploy commit. Flux applies a manifest-only change by
  itself. A rebuilt image with the same digest skips the commit and checks. CI itself ignores pushes to `main` that only
  change `osrs-tracker-web.yaml` and sitemaps (deploy commits and their reverts), so they start no deploy run at all.
- **Merging is the end of the job: don't wait for or watch the `CD` run.** It smoke tests on its own, and a failure
  shows as a failed `CD` run (titled after the change it deploys) and a failed `Flux / sync` status, and reaches
  Discord. Only when the user asks, follow it with `gh run list --workflow deploy.yml -L 3` and
  `gh run watch <id> --exit-status` as a background command, like Release step 3's watch (auto mode may block both as a
  production deploy: then give the user the command, or read
  `gh api repos/osrs-tracker/osrs-tracker-web/commits/<sha>/status`), then check changed pages in the browser and read
  `kubectl -n osrs-tracker logs deploy/osrs-tracker-web --since=5m` (reading the cluster is fine).
- **Retry** a failed deploy (Docker Hub or Flux hiccup) by re-running the failed `CD` run; a later docs-only push won't
  redeploy.
- **Never `kubectl apply` the manifest** or push an image by hand: Flux reverts anything that isn't on `main` within 10
  minutes. Manifest changes go through `main` like code. `npm run docker:build` is fine for checking the image locally.
- A failed deploy fails the run and alerts Discord. Rollback and failure modes: `docs/runbook.md`.
- Testing workflow shell snippets locally: Claude Code's `grep` is a shell function wrapping ugrep, which differs from
  CI's GNU grep (e.g. `grep -q -v` on mixed input). Use `command grep` there.

## Release ("release it", "ship it")

Run end to end without asking; stop only on failure. Verify locally once before committing, then CI is the gate. Run
each outward step (push, `gh pr create`, `gh pr merge`) as its own Bash call in the allow-listed form: no pipes, `&&`
chains or loops, which the permission check reads as something else and blocks. When a step is blocked, give the user
the exact command; never edit permission settings, ask another session to run it, or reach the same result another way
(`git merge -X ours` is blocked too: resolve conflicts by hand).

1. Commit on `<type>/<short-name>` (in a worktree, `git switch -c` it from where you started: a `claude/…` branch or a
   detached `HEAD`), `git fetch origin && git rebase origin/main`, push, `gh pr create --base main`.
2. Review the PR with two subagents in parallel, without passing `model`: `conventions-reviewer` (its report starts with
   a `VERDICT:` line), and a `general-purpose` agent that runs `/code-review high <n>` and returns only its findings, so
   the review gets a fresh context and its reading stays out of the session. Check each finding against the code before
   fixing it, and drop the ones that don't hold. At most 2 rounds of fixes, then ask.
3. Poll `gh pr view <n> --json mergeable,mergeStateStatus` until it isn't `UNKNOWN` (a conflicting PR gets no CI: rebase
   and push again), then run `gh pr checks <n> --watch` as a background Bash command (`run_in_background`) and carry on:
   it wakes the session once, when it exits. In the foreground it blocks the turn; Monitor, `/loop`, `sleep` or a
   polling loop re-read the whole conversation on every wake-up. If it exits at once with "no checks reported", the
   checks aren't registered yet: run it again.
4. When checks pass: `gh pr merge <n> --merge` (if Claude Code's permission check blocks it, give the user the command
   and wait, don't retry or work around it). It merges right away, which deploys.
5. `git fetch --prune origin`, `git switch --detach origin/main` (in a worktree, `main` is checked out elsewhere) and
   `git branch -d <branch>`. Done: the deploy runs on its own (see Deploy).

`main` doesn't require a PR to be up to date, as every merge and the digest commit after it leave all other open PRs
`BEHIND`: merge a `BEHIND` PR as it is, without rebasing first. Rebase (`git rebase origin/main`, push with
`--force-with-lease --force-if-includes`) only when it's `DIRTY` (a conflict, usually two PRs' `CHANGELOG.md` entries:
keep both under one day's heading). CI on `main` tests each merged result and `CD` deploys only when it passes, so two
PRs that pass alone but clash together fail there and deploy nothing: fix `main` first (`docs/decisions.md`).

`main`'s ruleset also blocks a merge until CodeQL (default setup) has analysed the PR, and default setup skips a PR that
changes no JS/TS or workflow file (seen in osrs-tracker-packages; GitHub doesn't document it): such a PR stays `BLOCKED`
with no `CodeQL` check. Once the required checks (`build`, `lint`, `test`, `links`, `zizmor`) pass and
`gh pr checks <n>` lists no `CodeQL`, merge with `gh pr merge <n> --merge --admin`. `--admin` skips every rule, so never
use it while a check fails or is pending (osrs-tracker/osrs-tracker-packages#11).

## Commit and push

- Conventional commits. What counts as doc-only, and how to push it: `CLAUDE.md`. Admin bypasses `main`'s PR rule; after
  a direct push, check its CI run: its id from `gh run list --commit <full sha> --workflow nodejs.yml` (empty for a few
  seconds after the push: run it again), then `gh run watch <id> --exit-status` as a background command, like Release
  step 3's watch (or the commit's checks with `gh api repos/osrs-tracker/osrs-tracker-web/commits/<sha>/check-runs` if
  that's blocked). A direct push that changes the image deploys too.
- `chore(deploy)` is reserved for the `CD` workflow's digest commits.
- Deploys start from `main` only, so production never runs unmerged code.
- `CHANGELOG.md` format (which changes need an entry: `CLAUDE.md`): newest date first. It's shown on `/about/changelog`,
  so write for users, and say why, not only what. Busy days get `###` subtitles (user-facing first, "Behind the scenes"
  last). Extend existing entries over near-duplicates; don't repeat the subtitle in entries. When adding an entry,
  reread the whole day: add subtitles once it's busy, and merge entries about the same feature. Each day starts with a
  line that is exactly `## YYYY-MM-DD`: the page (`features/about/changelog/changelog.ts`) splits the file on those
  lines, renders their headings itself ("23 October 2026", linked from the year buttons) and drops anything before the
  first, so no `# Changelog` title or preamble; a heading with more text joins the day before. It also curls quotes and
  dashes (outside code).
- GPG "Inappropriate ioctl for device": ask the user to run `echo test | gpg --clearsign > /dev/null`, then commit
  within ~10 min.
- If `gh pr edit` fails on a Projects (classic) error, use
  `gh api -X PATCH repos/osrs-tracker/osrs-tracker-web/pulls/<n> -F body=@<file>`.
