# Decisions

Choices that look like accidents without their context: what was decided, why, and when to revisit. Newest first.

## One padding per kind of surface, through a token (2026-10-28)

- **Context:** cards had grown their own padding: `py-3`, `px-5 py-3`, `p-5`, `px-5 py-4`, `p-3`, and 16px sides on
  phones for lists only. On an item's page on a phone, Price, Trade volume and Profit calculator started their text at
  12, 16 and 20px, one above the other. Six cards built their own copy of the 56px header.
- **Decision:** the table under Padding in the skill's Design system: one value per kind of surface, smaller the deeper
  it sits (panel 32, card 20, stat tile 16, inner tile 12; the kb's SPACE-021 and SPACE-007). A card's sides are a
  token, `px-card`, 16px on phones (the one-line list rows need the width) and 20px from `sm`. It changes in `base.css`,
  so templates carry no `max-sm:` overrides (GOV.UK's responsive spacing, kb SPACE-003). Phone list rows went from 10 to
  12px above and below: 56px, the header's height, back on the scale. `.card-header` in `components.css` replaces the
  hand-built headers. Review flags a raw `px-5` on a card.
- **Revisit:** if a dense view needs tighter cards, add a second token instead of overriding `px-card`.

## A documented spacing scale, not an enforced one (2026-10-28)

- **Context:** Tailwind 4 compiles any multiple of `--spacing`, so off-scale steps (3, 7, 9, 18px) crept in, some of
  them per-breakpoint margins nudging an icon or label into line (osrs-tracker/osrs-tracker-web#477). Tailwind can limit
  spacing to named steps (`--spacing: initial` plus `--spacing-N`), but sizes and positions (`w-`, `h-`, `size-`,
  `inset-`, `translate-`) share the same variables: about 600 of them in the templates.
- **Decision:** list the scale in `theme.css` and keep the multiplier free. Icons sit beside text by flex centring or a
  box one line tall (`h-lh`), not by a margin, and a label that still sits a pixel off gets `text-trim-cap`
  (`text-box: trim-both cap alphabetic`). Of the steps #477 listed, three stay and say why in a comment: the load
  error's 3px negative margin, the account badges' icon padding and the news skeleton's bars. Older in-between steps
  elsewhere (14px gaps in the day log, selects' room for their chevron) stay until their component next changes.
- **Revisit:** if off-scale spacing keeps reappearing in reviews; then name the size steps too and enforce the scale.

## osrs-tracker.net, with a one-time carry-over of saved data (2026-10-25)

- **Context:** the site moved from osrs-tracker.freekmencke.com to osrs-tracker.net (roadmap
  osrs-tracker/osrs-tracker-web#448). Favourites, recents, theme, offset and the news day live in `localStorage`, which
  belongs to one origin, so a plain 301 would empty them for every returning visitor. Browsers partition storage in
  third-party iframes, so the new origin can't read the old one's from an iframe either.
- **Decision:** the old host 301s every path to the same one on the new host with `#from-old` (Google ignores
  fragments), except `/carry-over` (`src/server/routers/carry-over.ts`). The first inline script in `index.html` sends a
  person who arrives with `#from-old` and nothing stored to that page once; it returns with `#carry-over=<its storage>`
  in the fragment, which never reaches a server, and the script imports it before anything reads storage. Crawlers skip
  the trip. The consent choice isn't carried, so a crafted link can't set it. The new host's certificate comes from an
  Ingress annotation, not a standalone `Certificate`: Flux's `flux-deployer` role may manage Ingresses, not Certificates
  (a standalone one blocked every deploy, osrs-tracker/osrs-tracker-web#454).
- **Revisit:** remove the carry-over from 2027-04-25 (osrs-tracker/osrs-tracker-web#453); keep the 301 while the old
  host gets traffic.

## Pixel icons in fixed boxes have no `width` and `height` (2026-10-23)

- **Context:** the UI review (osrs-tracker/osrs-tracker-web#412) counted images without `width`/`height`: 371 on A–Z, 49
  on a player page. They are the game's pixel icons, item icons and world flags.
- **Decision:** leave them. Each sits in a box of fixed size (a 32px tile, a set height), so it can't shift the layout
  while it loads, and item icons vary in size, so one pair of numbers would be wrong for most of them.
- **Revisit:** if a layout shift is measured on one, or an icon moves out of its fixed box.

## List cards keep their layout shifts and one-line rows (2026-10-23)

- **Context:** the UI review (osrs-tracker/osrs-tracker-web#407) flagged the tracker landings' per-device cards, which
  the server renders as five skeleton rows before the browser reads local storage and shrinks them to the empty message,
  the 768px grid that leaves favourites under the global card, cut-off item names on phones, and empty states for news
  and A–Z letters.
- **Decision:** keep the skeleton placeholders and the plain grid. The measured layout shift on a first visit to
  `/trackers/xp` is 0 at 375×812 (below the fold), 0.024 at 768×1024 and 0.014 at 1440×900, well under the 0.1 "good"
  line, and there's no field data for it to affect. Tried and rejected: an empty-card-sized placeholder (regulars' cards
  jump the other way), fixed-height per-device cards (tall empty cards), and spanning the global card over two rows at
  768 (the blank only moves to the other column once lists fill). Rows stay one line: stacking the price above the pill
  on phones and two-line names were mocked up and rejected; names that don't fit carry a `title`. No empty state for the
  news (Jagex's feed always has posts) or a browse letter (every letter has items), and A–Z keeps reading across rows.
- **Revisit:** with field data showing a poor CLS on the landings, or when a browse letter or the news can come back
  empty.

## The live dot pulses forever (2026-10-23)

- **Context:** the "Online now" dot on Players online pulses beside the count. osrs-tracker/osrs-tracker-web#391 stopped
  it after two cycles, so it would end within five seconds (WCAG 2.2.2, Pause, Stop, Hide).
- **Decision:** the owner prefers the endless pulse and accepts failing 2.2.2 for it, as freekmencke.com does with its
  cursor and arrow. `--animate-live` in `theme.css` runs `infinite`; `motion-reduce:after:animate-none` on the dot turns
  it off under reduced motion (2.3.3), and the keyframes animate only `transform` and `opacity`, so the compositor runs
  them without repaints.
- **Revisit:** if the site has to pass WCAG 2.2 AA in full, limit the iterations again or add a pause control.

## Focus moves to the new page's heading after a client-side navigation (2026-10-18)

- **Context:** the router doesn't move focus, so after following a link focus stayed on it, or fell to `body` when it
  was removed, and screen readers got no cue that the page changed (claude-kb ACCESS-012).
- **Decision:** `RouteFocus` (`core/routing/route-focus.ts`, started in `app.config.ts`) focuses `main h1`, or `main`
  without one, after every navigation but the first, which keeps the browser's own start on a loaded page. It gives the
  target `tabindex="-1"` at runtime, so templates don't need it, focuses with `preventScroll`, so
  `scrollPositionRestoration` still scrolls. Only when it focuses `main`, which has no name, does it announce
  `document.title` through CDK's `LiveAnnouncer`: a screen reader reads a focused `h1` already, and the title after it
  would say the page's name twice. The announcer is looked up only then, because it adds its live region to the page
  (and the server HTML) when created. A navigation that keeps the path (the news filters write the query) leaves focus
  alone while it's inside `main`, as a control there made it. `base.css` drops the focus ring on those script-focused
  targets.
- **Revisit:** a page whose `h1` renders only after a browser-side load gets `main` focused instead; give it its `h1` up
  front if that matters. If a screen reader turns out to stay silent on a script-focused `h1` (reported for some iOS
  VoiceOver versions), announce the title there too rather than drop the focus move, and accept the name read twice.
- **Update 2026-10-23:** the title goes through `Announcer` (`common/a11y/announcer.ts`), which wraps the same
  `LiveAnnouncer`, looked up on its first message, and also reads `announceChanges`' result messages. The layout's skip
  link focuses the same target through `RouteFocus.focusContent()`, scrolling to it.

## Accessibility is checked by template lint, an axe scan and a keyboard walk (2026-10-18)

- **Context:** nothing checked accessibility beyond `browser-checker`'s contrast measurements, so accessible names,
  roles, focus visibility and WCAG 2.2's target size went unchecked. Automated tools find only part of the issues: axe
  and Lighthouse passed a clickable `<div>` and a `role="button"` that can't take focus, and nothing automated judges
  focus order, focus after navigation or what alt text says (claude-kb ACCESS-008, ACCESS-011).
- **Decision:** three layers, cheapest first. angular-eslint's `templateAccessibility` rules run in `ng lint`, on the
  source, where they catch handlers on non-interactive elements that axe can't see. `scripts/a11y/a11y-scan.mjs`
  (`npm run a11y`, `playwright` and `@axe-core/playwright` pinned) runs axe on the WCAG 2.2 AA tags against a running
  server, per changed page and open state (`--click`); `wcag22aa` is in the list because axe skips `target-size` without
  it. It prints one line per violation, so the main session runs it itself: `browser-checker` has no Bash (frontmatter
  can't limit Bash to one command, and a hook that does is skipped in untrusted folders and `claude -p`), and passing
  axe-core (650 KB minified) through `browser_evaluate` on each check isn't practical. `browser-checker` adds the
  keyboard walk (Tab order, focus visible and not under the sticky nav, Enter, Space and Escape, focus after a
  navigation) and lists what nobody checked: alt text and label meaning, reading order, screen-reader output, zoom and
  reflow. Findings are fixed or turned off with `disableRules([...])` and a reason, never `exclude()`, which turns off
  every rule for that subtree.
- **Not chosen:** a Playwright Test suite with axe assertions: `browser-checker` already visits every changed page, and
  a suite would need its own server setup, fixtures and CI job for checks that change with each page (claude-kb's JSTEST
  recommendation 4). Lighthouse's accessibility category runs the same axe but sees only the page as loaded, not menus
  or dialogs.
- **Revisit:** if regressions reach `main` that the scan would have caught, which makes the scan worth running in CI.

## Line icons are Lucide's, from `@lucide/angular` (2026-10-17)

- **Context:** the line icons were a mix: 13 shared ones in an `svg[glyph]` component and 11 inline SVGs, drawn after
  Lucide, Feather and Heroicons (the Retry arrows were Heroicons' 1.5 stroke path at 2), some redrawn by hand, so a new
  icon had no set to come from. Side by side with Heroicons, Feather, Tabler, Phosphor, Material Symbols and Font
  Awesome Free, Lucide was the stroke set that had all 24 icons the site uses, was closest to what was there, and is the
  most used and maintained (`lucide-react` alone about 109M npm downloads a week; Feather, where it started, has had no
  update since March 2025).
- **Decision:** every line icon is a Lucide icon from `@lucide/angular`, Lucide's own Angular package: a standalone,
  signal-based `svg[lucideSearch]` component per icon, rendered by a template, so the server HTML has the paths and
  hydration keeps them, and the compiler checks the names. Only imported icons are bundled. The cost: each icon's
  component carries its own compiled copy of the package's template (about 3.4 KB minified), and the package is a single
  module, so every icon used anywhere lands in `main`. The 24 icons and `svg[lucideIcon]` (for `status-panel`) grow
  `main` from 48.8 to 131.6 KB, but only from 15.5 to 18.4 KB gzipped, as the copies compress to almost nothing.
- **Not chosen:** `lucide-static`'s icon font (300 KB of WOFF2 for every icon plus 105 KB of CSS, blank icons until it
  loads, one fixed weight) and its sprite (529 KB, 90 KB gzipped, an extra request) need a subsetting step of our own.
  `svg[lucideIcon]` fed with the `lucide` package's raw data compiles the template once, but takes icons as strings
  registered in the app config (unchecked until runtime) or as a data field per icon on each component. The older
  `lucide-angular` supports Angular up to 21 only. Copying paths into a component of our own, as `svg[glyph]` did, means
  updating them by hand.
- **Revisit:** if the site uses many more icons (each adds about 3.4 KB to `main` before compression), or when
  `@lucide/angular` compiles its template once.

## The nav is Home, Trackers and Game, with menus (2026-10-13)

- **Context:** the nav had three plain links (Home, XP Tracker, Price Tracker). The October roadmap adds pages a plain
  link can't hold: high-alch and margin tables, price alerts, the news archive, the catch-up and the players online
  page.
- **Decision:** three tabs, Home | Trackers ⌄ | Game ⌄ (design option E). Three, so phones keep today's row of three
  equal tabs; a menu opens as a full-width sheet there. Trackers holds both trackers stacked, Game the site-wide game
  pages; each feature adds its own row when it ships, so the menus never link to a page that doesn't exist. The menus
  are disclosures (a button and a panel of links), not ARIA menus, and their links stay in the server HTML while closed,
  so crawlers still find every tracker page from the nav. Enter or Space opens one and leaves focus on its button, as in
  the WAI-ARIA disclosure navigation menu: the next Tab enters the panel, and a screen reader hears "expanded" on the
  button instead of a jump into the list (osrs-tracker/osrs-tracker-web#402). No favourites or other page data in the
  Trackers menu: they'd repeat the pages and need a cap. Game's Players online card is the exception, loaded when the
  menu opens. No global search and no "Menu" button.
- **Revisit:** if a menu outgrows a phone screen, or a fourth top-level section is needed.

## Compared days go in the URL without navigating (2026-10-13)

- **Context:** the player page's Compare view (`player-detail/compare/compare-days.ts`, in the day log's place behind a
  Days/Compare switch) lets a visitor pick two days, or one, and a comparison is worth sharing. A router navigation for
  each pick would scroll to the top (`scrollPositionRestoration`), and `ParamAwareReuseStrategy` only recreates the page
  when path params change.
- **Decision:** the picks are query params (`?day=2026-10-12&vs=2026-09-12`, `vs=none` for one day) written with
  `Location.replaceState`, so the router never sees them: no scroll, no new history entry, no resolver run. The card
  reads them once from `Location.path()`; a link with `day` opens Compare and scrolls to it. Back to Days takes them out
  of the URL (a reload shows the days); Compare shown again puts them back. Days are keyed by the check's UTC date; a
  day with no check at the visitor's tracking offset falls back to the newest or oldest. The whole history is one
  browser-only request (`size=91`, about 40 KB compressed), not in the transfer state.
- **Revisit:** if the picks need back-button support, or a second feature puts state in the player page's URL.
- **Update 2026-10-23:** the price tables keep their options (filter, membership, volume, buy at, sort) the same way,
  through `core/routing/query-state.ts`, which Compare now shares. They read them once when the page is created, also
  during SSR, so the server renders and transfers the URL's view and hydration still fetches nothing.

## Pull requests merge without a queue or an up-to-date rule (2026-10-14)

- **Context:** parallel sessions merged 40 PRs in four days, and every merge, plus the digest commit `CD` pushes after
  it, turns the other open PRs `BEHIND`. With strict required checks, each had to rebase, push and wait for CI again. A
  merge queue (2026-10-13 to 2026-10-14) fixed that, but every merge then waited for a queue run, built and tested the
  same commit twice (in the queue and on the push to `main`), and those duplicate check runs kept the `changes` job from
  ever skipping build and test for the next docs-only push.
- **Decision:** no merge queue and no "require branches to be up to date": a PR merges once its own `build`, `lint`,
  `test`, `links` and `zizmor` pass, even when `BEHIND`. CI on the push to `main` tests the merged result and `CD`
  deploys only a `main` that passed, so two PRs that pass alone but clash together fail there and deploy nothing until
  `main` is fixed. The digest commit and doc-only pushes still go straight to `main` (deploy key, admin bypass).
- **Revisit:** if PRs that each passed start breaking `main` together more than rarely.

## Google Analytics loads only after consent, from a banner with equal buttons (2026-10-13)

- **Context:** Belgian and EU rules treat analytics cookies as not strictly necessary, so they need prior, active
  consent; "by using the site you agree" doesn't count, and the Belgian DPA fined a small site for it (Jubel.be, 2019).
  GA4 without cookies reports nothing for a site this size: Google only models cookieless pings from 1,000 consenting
  users a day up. A self-hosted cookieless tool (Umami) was the alternative; GA4 with a banner was chosen to keep its
  reports.
- **Decision:** gtag.js isn't loaded until the visitor allows it (not consent mode's "advanced" setup, which sends
  cookieless pings to Google before any choice). `index.html` loads it on page load when `analytics-consent` is
  `granted`; `ConsentStore` loads it on Allow, and on Don't allow sets Google's `ga-disable-<id>` opt-out and deletes
  the `_ga` cookies; `AnalyticsService` pushes nothing once the choice is `denied`. gtag batches hits, so a scroll hit
  recorded just before Don't allow can still go out a few seconds after it: data collected under consent, which
  withdrawing it doesn't undo (Article 7(3) GDPR), and gtag has no way to drop it. Events from before a choice wait in
  `dataLayer`. The banner (`core/layout/consent-banner.ts`) is fixed over the page (no layout shift), not a modal, and
  has two identical buttons, as regulators count a highlighted Accept beside a faint Reject as steering. Cookies in the
  footer reopens it. While it shows, the page keeps its height clear at the bottom (scroll padding, and room after the
  footer), so it never covers what Tab focuses (WCAG 2.4.11); rendering it after the footer on phones instead would keep
  most phone visitors from ever seeing it.
- **The banner is in every page's server HTML:** rendered only after hydration, it painted about a second after the page
  and became the page's largest contentful paint (LCP 3.5 s instead of 2.5 s in PageSpeed Insights). The choice is in
  this device's storage and the page cache serves everyone the same HTML, so the server always renders it, and
  `index.html` hides it before the first paint with a `<style>` of its own when a choice is stored (a rule in
  `styles.css` would be dropped from the build's critical CSS, as no element matches it at build time).
  `ConsentStore.init()` then removes the banner, and `reopen()` removes that style. `data-nosnippet` keeps its text out
  of search results.
- **Revisit:** if analytics moves to a cookieless tool (no banner needed), or the rules or the DPA's guidance change.

## The Wiki prices API is called through v2, as its guidelines ask (2026-10-13)

- **Context:** a Wiki prices API developer pointed out on Reddit that per-item time series are hard for them to cache,
  and that tools overloading their database are why the endpoint is slow. The API's guidelines
  ([Real-time Prices](https://oldschool.runescape.wiki/w/RuneScape:Real-time_Prices), short link `osrs.wiki/RS:PRICES`)
  ask for a descriptive User-Agent and bulk lists over one request per item, and say v1 "may be removed in the future".
  v1's `timeseries?timestep=` misses the Wiki's CDN; v2's `timeseries?lookback=` is served from it
  (`cf-cache-status: HIT`, cached for minutes to a day by lookback).
- **Decision:** every Wiki prices call uses `/api/v2/osrs` (`pricesBaseUrl` in `src/config/config.ts`). The item page's
  ranges map to lookbacks: 1D `24h` (5-minute steps), 1W `7d` (hourly), 1M `30d` (6-hourly), 1Y `1y` (daily). The time
  series stay browser only and load on demand: one on page load, one more per range clicked, never on a timer. Server
  requests send `github:osrs-tracker/osrs-tracker-web` (`config.userAgent`).
- **Revisit:** if the Wiki changes a lookback's step (it doesn't guarantee it), or the site's traffic grows enough that
  the API should fetch and cache the series for every visitor.

## Item link previews are drawn by the server (2026-10-11)

- **Context:** every item page sent the square app icon as its `og:image`, so every shared item link looked the same
  (#208). The Wiki's item icons are about 30px, too small for any card.
- **Decision:** the server draws a 1200×630 card per item at `/og/item/:id.png` (`routers/og-images.ts`,
  `og/item-card.ts`): its icon, name, examine text, buy limit and alch values, never a price, as chat apps keep a
  preview for weeks. `satori` lays it out as SVG and `@resvg/resvg-wasm` turns that into a PNG. Both are plain JS and
  WebAssembly, bundled into `server.mjs` with the SOLIX TTFs and the `.wasm` (esbuild's `binary` loader in
  `angular.json`): the image ships only `dist/`, without `node_modules`, which rules out native `sharp` or
  `@resvg/resvg-js`, and `sharp` would also need system fonts on Alpine. The renderer chunk (about 5 MB) loads on the
  first image request. Images live a week in browsers and preview caches, the last 200 in memory; `?v=` in the page
  meta's URL busts them when the design changes. Rendering in the API (it has `sharp`) was dropped: two repos for one
  feature, and the same font problem.
- **Player cards (2026-10-13):** `/og/player/:username.png` (`og/player-card.ts`) draws the player's latest hiscores at
  the default offset: account type, name, combat level, total level and XP, and the in-game skill grid with 99s in gold
  (gold only on the card: on the page a 99 already shows as an empty progress bar, and gold bars there drew too much
  attention). No progress bars on the card: at chat size they shrink to 2px, and progress is what goes stale first. The
  footer dates the stats, as previews are kept for weeks. Stats change daily, so an image lives an hour, in memory and
  in `Cache-Control`, not a week. The API is asked with `preview=false`, so an image URL never makes it call the
  hiscores: a player it doesn't store answers 404, and their page (the API's live preview) keeps the square app icon.
  Without hiscores at the default offset the card shows only who they are. The skill and account icons are the site's
  own (`public/assets/icons`), bundled like the fonts; satori and resvg draw their GIFs as they are. A regular account's
  person is Lucide's, as on the page: `lucideIcon()` (`og/lucide-icon.ts`) writes a component's static `icon` data
  (`LucideUser.icon`) as an SVG image with Lucide's default stroke, so the shape comes from `@lucide/angular` itself.
- **satori 0.56 (2026-10-14):** 0.33 to 0.55 were held back because `harfbuzzjs`'s Emscripten loader read `hb.wasm` from
  `__dirname`, which fails inside the bundle; satori now inlines that wasm. Specs never render a card, so check a bump
  in the production build (render each card route). Like browsers, satori defaults to `content-box`: `el()`
  (`og/card-kit.ts`) makes every element `border-box`, as Tailwind does on the site.
- **Fonts:** satori lays out kerning and turns on OpenType features through HarfBuzz (`tabular-nums` for the tiles'
  values), but can't read a variable font: loading the site's `SOLIX-Variable.woff2` breaks every font. `og/fonts/`
  holds the SOLIX release's static `ttf/SOLIX-Regular.ttf` (400) and `ttf/SOLIX-SemiBold.ttf` (600) as they are, outside
  `public/`, so they aren't served. Replace them when the site's SOLIX is bumped, and bump the cards' `?v=`
  (`item-detail-meta.ts`, `player-detail-meta.ts`, the players online route in `app.routes.ts`).
- **Tests load them as files:** with a `binary` loader, Angular's external-packages plugin resolves every bare import
  itself, and the browser-platform test build can't resolve `node:fs`, so every server spec failed to bundle. `ng test`
  builds with `development,test`; the `test` configuration switches both to the `file` loader, which leaves package
  handling alone. Specs never render a card: the router spec injects its renderer.

## Tablet layout for Home (2026-10-11)

- **Context:** between `md` and `xl` (768–1279px), Home stacked the hero's preview card under the search, kept the news
  at two large cards per row and the tracker lists at one column, so a tablet's Home (about 2,750px at 820px wide) was
  longer than the phone's.
- **Decision:** from `md` to `xl` the preview card stays beside the hero text at 300px (the Player/Item switch takes its
  own row in the search box), the news is four cards in a row with the phone's compact card (the `compact` variant in
  `tailwind.css`: below `sm`, and `md` to `xl`), and the lists sit side by side from `md`. Tried in the design canvas
  first (Home's tablet artboard, the `layout` tweak); about 1,460px at 820px wide.
- **Revisit:** if the news gets more than four items, or the hero gets more content beside the search.

## Browse pages render every row at once (2026-10-10)

- **Context:** PageSpeed's mobile lab run gives the A–Z browse pages a high Total Blocking Time
  (`/trackers/price/browse/s`, 600 rows: 0.7–1 s). Profiling showed the per-row `rxResource`s are only about 10% of it;
  most of it is rendering every row's prices at once after the shared `/latest` and `/24h` fetch. On desktop it's about
  300 ms.
- **Decision:** leave it. There's no field data, so the lab number has no ranking effect, and the pages exist as a crawl
  path: CDK virtual scrolling would drop the item links from the server HTML.
- **Revisit:** with field data (Core Web Vitals in Search Console) or a visitor's complaint, not from throttled lab runs
  alone.
- **Update (2026-10-23, #412):** `content-visibility: auto` on the rows keeps the links and skips off-screen rendering,
  so it was measured on `/trackers/price/browse/a` (397 rows, a local production build, 4× CPU throttling, median of 8
  loads each): layout 105 ms with it against 110 ms without at 1440px and 129 against 128 ms at 390px, no gain in style
  or total task time, and a slower LCP (696 against 514 ms at 1440px). Not adopted.

## Red in the dark theme is solid, not a tint (2026-10-10)

- **Context:** the change pill (`item-row.ts`) needs 4.5:1 contrast at rest and on a hovered row, in both themes. In the
  dark theme a see-through red over the blue slate turns pink or mauve, and the lighter reds that pass the contrast read
  as pink or salmon.
- **Decision:** light theme: `up` green-800 and `down` red-800 on a 16% see-through pill. Dark theme: `down`
  `oklch(0.74 0.155 28)` on a solid `down-pill` `oklch(0.35 0.065 27)` (`base.css`), picked from mock-ups. Rejected:
  red-400 on a darker pill (dull), a 12% warm tint (too faint), `oklch(0.30 0.08 27)` and a filled red-600 pill (too
  loud).
- **Revisit:** before changing a red in the dark theme, show mock-ups in both themes with the contrast at rest and on
  hover.

## XP gains count a first appearance as gained (2026-10-10)

- **Context:** since the keyed hiscore entries (#176), `hiscoreDiff` (`@osrs-tracker/hiscores`) counts a missing or
  `null` value as 0. When a value first appears, all of it counts as gained that day: Jagex adds or renames a hiscore
  with backfilled counts, or an activity crosses Jagex's ranking minimum ("+5" boss kills at the fifth kill).
- **Decision:** that's fine; no special case. Likewise `overallOf` (`@osrs-tracker/models`) throws when Overall is
  missing, with no fallback: every hiscore entry, stored or live, has Overall.
- **Revisit:** if a visitor reports a misleading gain, or Jagex ever omits Overall.

## No visible text for search engines only (2026-10-10)

- **Context:** SEO issues proposed visible additions: a summary sentence on item pages (#162, built) and a "related
  items" card from a name search (#167).
- **Decision:** both dropped. The sentence repeated the tiles and header, and a templated sentence is as alike across
  pages as the tiles, so it doesn't fix thin content either; related items by name made no sense to visitors. SEO work
  goes into meta (title, description, canonical), internal links that make sense to visitors (the A–Z browse pages,
  #168) and speed; never hidden text.
- **Revisit:** a proposal for visible copy or UI that tells visitors something the page doesn't already show.

## The item and player sitemaps are built by the server (2026-10-10)

- **Context:** the build wrote every sitemap, so the players one (a new hiscore entry for every tracked player each day)
  and the items one were only as fresh as the last deploy, which can be a week. A scheduled regeneration wouldn't help:
  a sitemap-only commit skips the deploy (`NOT_IN_IMAGE` in `deploy.yml`), so the image keeps the old files.
- **Decision:** `routers/sitemaps.ts` builds `/sitemap-items.xml` and `/sitemap-players.xml` from the API on request
  (through `API_INTERNAL_URL`), kept in memory per replica for as long as the API caches the lists: items a day, from
  the 27 `GET /items?letter=` lists, so every listed id resolves (not the Wiki's list, which can be ahead of the API),
  each dated by its `updatedAt` (since 2026-10-25: when the API's ingester last stored a change to the item's Wiki
  fields, its add included; items stored before then have no date and no `<lastmod>`, as the API kept no history to
  backfill from, and `lastFetch` is when a visitor looked, not a change); players an hour, from `GET /sitemap/players`
  (tracked, not paused, an entry in the last 30 days), at their canonical lower-case name, dated by the newest entry. A
  failed or empty load keeps the last good copy and retries after a minute; with none yet, 503. The site sitemap and the
  index stay build-time files: their dates come from git, which the image doesn't have. The index dates only the site
  sitemap. No `<priority>` or `<changefreq>`: Google ignores both.
- **Revisit:** if a sitemap nears 50,000 URLs (4,663 items and 534 players on 2026-10-10), or the API gets one endpoint
  for every item id.

## Server logs are JSON with a type (2026-10-09)

- **Context:** the request log was JSON, everything else plain text, and errors spread their stack over many lines,
  which Loki stores as separate entries. Logging the requests renders make, in the request log's shape, made the two
  hard to tell apart.
- **Decision:** every line the server writes is one JSON object with `level`, `time` and a `type` (`incoming`,
  `outgoing`, `lifecycle`, `uncaught`, plus this app's own in `WebLogType`, `server/utils/log.ts`), errors with their
  stack in `error`. The lines, the request log and the `outgoing` log come from `@osrs-tracker/logger` (pino, in
  `osrs-tracker-packages`), shared with the API so both write the same shape; morgan is gone. Angular's own console
  output, and the app's `console.error`s (which also run in the browser), stay plain text.
- **Revisit:** if the API's logs should be queried together with these: they're the same shape and both have `type`.

## Item pages load the price history in the browser (2026-10-09)

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
- **Update (2026-10-09):** in the first 45 minutes after the deploy, 3 of 20 item page renders still waited 3.4 s, 7.4 s
  and 14.8 s for a `latest` call. OSRS Wiki requests now carry the `SSR_TIMEOUT` context token, and during SSR
  `ssrTimeoutInterceptor` gives those Angular's own request `timeout` of `ssrRequestTimeout` (3 s, `server-config.ts`),
  which aborts the `fetch` (an `aborted` `outgoing` line, `responseTime` about 3 s) and fails the request. An item page
  then shows the prices as loading and the browser loads them. Opt-in, not for every request: a general timeout also
  turned a slow API or GitHub call into the error page (resolvers), a load-error box (player history, Home's news,
  cached for 5 minutes) or a bare 404 (the changelog's resolver had no error handler then), while only the Wiki was ever
  slow. Crawlers that hit a timeout see no prices in that page's HTML.
  - **Update (2026-10-23):** the changelog's resolver has had an error handler since #158 (2026-10-09), so a failed
    GitHub call now shows the error page, not a bare 404.
- **Update (2026-10-10, #149):** a day of `outgoing` logs (2026-10-09 16:35 to 2026-10-10 17:25 UTC, 1,224 item renders)
  showed the timeout capping renders (max 4.4 s, no more aborts) but not making them fast: p50 264 ms, p90 2.5 s, 12%
  over 1.5 s. The slow call was the item's `latest?id=<item>`: p90 2.2 s, 89 of 1,227 timed out. The nature rune's
  `latest?id=561`, same endpoint, had p90 232 ms and 15 timeouts. The Wiki caches responses for 60 s in Cloudflare by
  URL: a popular id or the full list is nearly always a `HIT` (about 100 ms), a rarely viewed item an `EXPIRED` that
  waits on the Wiki's own servers. The API (`items`, p99 226 ms) wasn't the problem. Now `getLatestPrices` always reads
  the full `/latest` (about 72 KB gzipped). The server keeps it for 60 s for every render (the data in a module-level
  variable, not the request, as a render only waits for its own `HttpClient`), leaves it out of the transfer cache and
  hands each item it renders to the browser in `TransferState` (`wiki-latest-<id>`), read until the app is stable like
  the HTTP transfer cache. The browser fetches the full list for later items too, kept by its HTTP cache for the same
  minute; the single-item request is gone. Not moved to the browser: crawlers would lose the prices, the item-specific
  content the SEO work (#159) relies on. The 3 s `SSR_TIMEOUT` stays as the safety net for a Wiki outage and for the
  request that refreshes the list when Cloudflare's copy has expired.
- **Update (2026-10-11):** 15 hours of logs after that deploy (2026-10-10 17:45 to 2026-10-11 08:41 UTC, 2,115 item
  renders, all page-cache misses): item renders p50 46 ms, p90 192 ms, p99 290 ms, 2 over 1.5 s. The full `/latest` was
  fetched 477 times (the other renders used the server's copy), all 200: p50 136 ms, p90 226 ms, p99 259 ms, max 2.24 s,
  no aborts. The slowest render (4.2 s) waited on our own API (`items/<id>`), which `SSR_TIMEOUT` doesn't cover. The
  timeout stays: it hasn't fired, but it's a few lines and still caps a render during a Wiki outage.
- **Revisit:** if `outgoing` lines for the full `/latest` are still slow, or the Wiki asks clients not to fetch the full
  list.

## Traefik compresses responses, the server sets cache lifetimes (2026-10-09)

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

## The server's connections outlive Traefik's (2026-10-09)

- **Context:** Traefik keeps idle connections to the pods for 90 s, Node closes them after 5 s, so Node can close one
  just as Traefik sends a request on it (a 502).
- **Decision:** `keepAliveTimeout` is 95 s (`server-config.ts`). On shutdown, `utils/shutdown.ts` closes connections as
  they become idle, otherwise a connection still sending a response would keep the server open until the forced exit.
  The metrics server closes only after the main one, so liveness keeps answering while it drains.
- **Revisit:** if Traefik's `serversTransport` idle timeout changes.

## Keyboard patterns come from `@angular/aria` (2026-10-09)

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
  close it while the other remains. So a host must take focus: `info-tooltip` is a button, the price tables' values
  carry `tabindex="0"`. A `[tooltip]` also describes its host (`aria-describedby`) by a `hidden` copy of its text, as
  the overlay only exists while open; the grids' cells opt out (`[tooltipDescribe]="false"`), as a copy per cell would
  render every cell's tooltip twice.
- **Day picker calendar** (`common/ui/controls/day-picker.ts`, Compare and the news catch-up) is a grid too, but renders
  only in the browser after a click, so it needs no `_pattern` call: opening it focuses the picked day, which makes it
  the Tab stop. Only the shown month is rendered, as its own grid, recreated on a month change (tracked by month): a new
  grid makes its first day the Tab stop, and the news range spans over a decade of months, too many to keep hidden. Days
  without a check are hard-disabled (`[softDisabled]="false"`), as a date with nothing to compare has nothing to read,
  so the arrows skip them; the month buttons use `aria-disabled`, so focus stays on them at the first or last month.
- **Revisit:** when `@angular/aria` gets a radio group or an API for the initial active item; drop `aria-tab-stop.ts`
  then.

## Sitemap dates come from git (2026-10-09)

- **Context:** `<lastmod>` came from file timestamps, which a fresh checkout (the `CD` workflow) sets to the checkout
  time, so every deploy moved every date and search engines learn to ignore them.
- **Decision:** `sitemap-site.js` takes each page's date from the last commit that changed its source file (the template
  for privacy and terms, the component for How it works, `CHANGELOG.md`), following renames, which don't count as a
  change. Without full history (a shallow clone, or the Docker build, which has no git or `.git`) it keeps
  `public/sitemap-site.xml` as it is: the image is built from the file the `CD` workflow just generated. The sitemap
  index dates the site sitemap by the day its content last changed (`sitemap-index.js`): today when the run changed it,
  else its last commit, in UTC. A day, not a time: `CD` commits a few minutes after generating, so a time would change
  again on the next deploy. The server-built items and players sitemaps get no date in the index. Item pages have no
  date of their own (the API's `lastFetch` is the last lookup).
- **Revisit:** if a page's content stops living in one file (e.g. it moves to the API or a CMS).

## Live hiscores load in the browser only (2026-10-08)

- **Context:** the player page renders on the server with the stored history, then fetches the live hiscores (through
  the `runescape-api` proxy) in the browser for today's gains, so the page changes a moment after it loads.
- **Decision:** keep the live fetch out of SSR. The proxy is shared with the API and the daily scrape, so rendering it
  on the server would call Jagex for every render, crawlers included, and make each render wait on Jagex (it was moved
  to the browser on 2025-04-24 for that). Instead, nothing jumps when it arrives: today's day-log card is a skeleton
  until then (also in the SSR HTML; a day with nothing gained yet then shrinks to the one-line outlined card, 144px to
  56px, accepted on 2026-10-27 and again for one line on 2026-10-28, because no skeleton can match a day's rows ahead),
  the header only says "Last checked …" when the stored stats are what's shown, and `BaseChart` keeps drawn datasets
  over the same dates so only the newest point moves. The rendered page carries a `<link rel="preload" as="fetch">` for
  the request (2026-10-13), so the browser starts it while it reads the HTML instead of once the app has loaded; the
  server still doesn't call it.
- **Revisit:** if the proxy gets its own rate limit headroom, or the API starts storing intraday stats.

## Phone layout for Home and the lists (2026-10-08)

- **Context:** on phones, Home's four news cards stacked as full-width image cards (about 1,500px of scrolling before
  the tracker lists), and list rows were sized for desktop.
- **Decision:** below `sm`, the news is a 2×2 grid of the same picture-on-top cards, the picture uncropped, the title
  first and a one-line "7 Oct · Category". Tried in the design canvas and rejected: cropped thumbnails, a small
  thumbnail beside the text (a wrapping title leaves it floating), a lead story with rows, and a sideways swipe row (it
  broke the page margins). List rows drop to one line: no total level, the item price beside the change.
- **Revisit:** if the news gets more than four items, or the lists need the total level back on phones.

## Missing asset paths get a plain 404 (2026-10-08)

- **Context:** some crawlers (OAI-SearchBot) ignore `<base href="/">` and request `/trackers/price/chunk-*.js`. Those
  paths matched the item and player routes, so each one cost a full render and an API call with the filename as id.
- **Decision:** `middleware/missing-asset.ts` answers paths ending in a build asset extension with a 404 after
  `express.static`. No redirect to the root path (browsers cache the redirect, so a stale bundle name could keep
  pointing at the wrong file), no absolute asset URLs (`deployUrl` is deprecated), no blocking the crawler (it indexes
  real pages fine).
- **Revisit:** if a route ever needs to end in one of those extensions.

## Server-side rendering calls the API inside the cluster (2026-10-08)

- **Context:** SSR called the API through its public URL, so every call left the cluster and came back in through the
  router, Traefik's rate limit and the CrowdSec bouncer.
- **Decision:** with `API_INTERNAL_URL` set, the server uses the API's Service address; the browser keeps the public
  URL. The transfer cache maps the internal origin back to the public one, so cached responses still reach the browser.
  The API then sees the web pod as the client (no forwarded visitor IP).
- **Revisit:** if the API moves out of the cluster or behind a different Service.

## Deploys go through GitHub Actions and Flux (2026-10-08)

- **Context:** deploying needed Docker Desktop, a manual digest edit and `kubectl apply` from a laptop.
- **Decision:** merging to `main` deploys. The `CD` workflow builds the image and commits its digest with a deploy key
  (the only bypass of `main`'s PR rule); Flux in the cluster applies it, so GitHub has no cluster access. Commits that
  don't change the image skip the build, digest commits don't run CI, and the smoke test checks the web app only, not
  the API, so an API outage can't fail a good web deploy.
- **Revisit:** if deploys need an approval step, or a second environment appears.

## Aborted requests are warnings (2026-10-08)

- **Context:** a client that disconnects before the response has no status, and the logger counted it as a 500. Crawler
  aborts dominated the error count and would hide a real 500.
- **Decision:** log them as `warn` with `aborted: true` and the time until the disconnect, the same shape as the API.
  Not `info` and not dropped: they're the only sign that slow SSR pages make visitors give up.
- **Revisit:** if aborts stay high on one route; then that page's render time needs work.

## One visual system for the redesign (2026-10-07)

- **Context:** a review of the design canvas found drift: four card radii, about 19 font sizes, three segmented styles,
  12–18px card headers, 16 or 24px gaps, and an up green that was nearly the emerald accent.
- **Decision:** one scale each (the skill's Design system section lists them). The reasons that aren't obvious from the
  rules:
  - **Flat cards:** depth comes from the lighter card on the navy ground; a shadow is reserved for layers that float.
  - **Up is a true green** (`oklch(0.79 0.22 142)`), so a rise never reads as a link or button. Changes carry a sign
    (−8,402 (−0.6%)), no ▼/▲.
  - **Segmented:** the active pill is accent-filled, except beside an accent button (Home's Player/Item switch), where
    two accent fills would compete.
  - **Tabular figures on values only:** in a line of text ("Regular · Total 2,316") they look spaced out.
  - **Tracker landings keep equal cards**, each list scrolling in its card: the Price Tracker's three (global lookups,
    your lookups, your favourites) in a row from 1280px; the XP Tracker's four two by two from 768px since
    [#445](https://github.com/osrs-tracker/osrs-tracker-web/issues/445) (yesterday's top gainers beside your favourites,
    the global and your recent lookups below). The top gainers spanning the page above or below the lists, and in the
    global lookups' place beside them, were mocked up and not picked. Favourites as hero tiles, to avoid identical
    cards, was tried and reverted: parallel lists read more clearly. The hero accents the subject ("XP", "Price"), not
    "Tracker".
- **Revisit:** when a component needs a value the scales lack: add a token, don't make a one-off.

## Semantic colour tokens instead of `dark:` pairs (2026-10-07)

- **Context:** the redesign ([#78](https://github.com/osrs-tracker/osrs-tracker-web/issues/78)) has 18 colours per
  theme. Writing each as a `slate-*` class with a `dark:` partner doubled the classes in every template and let the two
  themes drift apart.
- **Decision:** Tailwind tokens (`bg-card`, `text-muted`, `border-line`, `text-up`…) backed by CSS variables that swap
  under `.dark` in `base.css`. Templates match the design canvas one to one and stay Tailwind-only (no arbitrary
  values). The palette behind them is plain `--palette-*` variables in `theme.css`: Tailwind's values for the steps in
  use, plus extra slate steps and a true green. Tailwind's stock colour utilities are switched off
  (`--color-*: initial`, 2026-10-23, [#422](https://github.com/osrs-tracker/osrs-tracker-web/issues/422)), so a template
  can't use a stock colour that skips the theme.
- **Revisit:** if a third theme is added (it's one more variable block), or a component needs a colour that isn't a
  token: add a token rather than a one-off.

## Features dropped in the redesign (2026-10-07)

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

## Item page volumes and averages come from the hourly series (2026-10-07)

- **Context:** the item page needs yesterday's 24-hour average (for the change in its header), the volume over the last
  24 hours and a week of daily volumes. The Wiki's `/24h` and `/volumes` endpoints return every item (about 390KB and
  50KB), and SSR would embed them in the page's transfer state. Its daily time series lags a day or two behind.
- **Decision:** derive all three from the item's hourly time series (v2's `7d` lookback, 168 hours; v1's had 365 and fed
  14 days), which the page loads anyway for the 1W price range: volume-weighted per UTC day, which matches `/24h`
  exactly. The item lists still use `/24h` (in the browser, shared between rows).
- **Revisit:** if the Wiki shortens the `7d` series or changes its step, or the numbers drift from the lists.
- **Update 2026-10-24:** the volume chart has its own range, with the price chart's series (shared, so neither fetches
  twice): per hour of the visitor's for 1D, per UTC day for 1W and 1M (the `30d` series' 6-hour steps start at UTC
  midnight), per UTC month for 1Y (`binnedVolumes` in `item-prices.ts`). The first bin is the first the range covers
  from its start. The `1y` series lags a day or two, so its last month is short by those days. The summary above the
  bars (today, the week's daily average) stays on the hourly series.

## GE tax rules are hard-coded (2026-10-07)

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

## Per-request CSP nonce for inline scripts (2026-10-04)

- **Context:** the CSP allowed `'unsafe-inline'` scripts. Angular SSR adds its own inline scripts (event replay,
  critical CSS) besides ours (gtag, theme), so a static hash list isn't practical.
- **Decision:** a nonce per response (`middleware/csp-nonce.ts`). `index.html` sets
  `ngCspNonce="CSP_NONCE_PLACEHOLDER"`, Angular copies it onto every inline script, and `applyCspNonce` swaps in the
  real nonce for rendered and cached pages. Inline event handlers are blocked (`script-src-attr 'none'`).
  `'strict-dynamic'` (2026-10-17) makes current browsers ignore `'self'` and the host allowlist, which Lighthouse calls
  bypassable: a script runs only with the nonce or when a script that has one adds it (the Google tag, lazy chunks,
  `main.js`'s imports). The allowlist stays for browsers without `'strict-dynamic'`. The cost: once analytics is
  allowed, whatever the Google tag loads runs too, from any host. The dev server (`npm start`) leaves `'strict-dynamic'`
  out (`isDevMode()`, false in the production build): Vite adds its client script (`/@vite/client`) without a nonce, so
  it would be blocked. Don't allow Vite's URL instead, as `'strict-dynamic'` ignores hosts.
- **Revisit:** any new path that serves HTML must call `applyCspNonce`, or its scripts won't run. A `<script src>` in
  `index.html` needs `nonce="CSP_NONCE_PLACEHOLDER"`, and a script added from code must be a
  `document.createElement('script')` (as `consent-store.ts` does): one written as HTML (`innerHTML`) is blocked. Without
  `'strict-dynamic'` the dev server runs such scripts anyway, so check a change to them on a production build.

## Every replica pre-renders its own pages (2026-10-04)

- **Context:** each pod's auto-generator renders and refreshes `serverConfig.autoGeneratedPages` on its own timers. With
  2 replicas that doubles upstream calls, and pods can serve slightly different versions of `/` for up to 5 minutes.
- **Decision:** accept it. The cost is negligible, and a shared cache would add a moving part (e.g. Redis).
- **Update (2026-10-13):** a page belongs in the list when it's the landing page, slow to render or static. Production
  logs over 4 days: `/` got about 73 requests a day (about 40 from browsers) against 576 timed renders, worth it for a
  cache hit in about 1 ms instead of a render of about 100 to 150 ms and for serving the last good render when the API
  fails. `/players-online`, rendered every minute (2,880 renders a day), had no requests yet, so it renders per request
  like the other pages (about 50 to 125 ms).
- **Revisit:** above 2 replicas, or if the auto-generated page list grows a lot.

## Production-only configuration (2026-10-04)

- **Context:** `src/config/config.ts` points at the production API, hiscores proxy and wiki prices, with no development
  or staging variant. The API's CORS allows only `http://localhost:4200`, so local runs use that port.
- **Decision:** stay production-only. A separate environment is overkill for a single-maintainer hobby project that only
  reads public data.
- **Revisit:** if local work needs to write data, or a change must be tested against an unreleased API.

## Changelog is written for users (2026-10-04)

- **Context:** `CHANGELOG.md` is rendered on `/about/changelog`, yet every change (dependencies, tooling, server
  hardening) gets an entry.
- **Decision:** write entries for users. Busy days are grouped under `###` subtitles, with invisible changes last under
  "Behind the scenes".
- **Revisit:** if the changelog page gets noisy.
