---
name: osrs-tracker-web
description:
  Angular 22 SSR conventions, the SSR transfer-cache and page-cache pitfalls, local runs, the Docker/Kubernetes deploy
  and the commit rules for osrs-tracker-web. Use when writing or reviewing code in this repo, debugging data that
  refetches or flashes after load, running it locally, or building, deploying, committing, pushing, releasing or
  shipping it.
---

# osrs-tracker-web

Detailed guide; the always-on summary, commands and hard rules are in `CLAUDE.md` and aren't repeated here. Deliberate
trade-offs in `docs/decisions.md` include production-only config, per-replica pre-rendering and the CSP nonce. The
`conventions-reviewer` agent reviews diffs against this file and `CLAUDE.md` at runtime, so keep code rules here or
there, not in the agent.

## Related repos

`../osrs-tracker-api` and `../osrs-tracker-aws` have their own skills.

- `src/config/config.ts` (production only): `apiBaseUrl` is the API, called during SSR, so its `Cache-Control` matters.
  `awsBaseUrl` is the API Gateway hiscores proxy, browser only; the API and a Lambda share it, so check changes in all
  three repos.
- `@osrs-tracker/hiscores` peer-depends on `@osrs-tracker/models`: bump both together, with `--prefer-online` right
  after a publish.
- Production test players: **the fraking** (active) for visual checks, **ToxSick** (inactive) for anything that writes.

## Angular conventions

- **DI**: `inject()` only; root services use `@Service()`, not `@Injectable({ providedIn: 'root' })`.
- **State**: signals, with explicitly typed public fields (`readonly foo: Signal<Bar> = computed(...)`). localStorage
  goes through a per-feature `@ngrx/signals` store (`XpTrackerStore`, `PriceTrackerStore`), never from components.
- **Async data**: prefer `httpResource` / `rxResource`; if you subscribe, reset loading state in `finalize`.
- **Failures**: every failable load shows its failure. `value()` throws in the error state, so check `error()` (or
  `hasValue()`) first and render `<load-error source="…" (retry)="resource.reload()" />`: `compact` when it replaces a
  single value in a row or widget, the default when it replaces a list or section, `panel` for a panel. Never
  `catchError(() => of(empty))` or an `error` callback that only empties the data.
- **HTTP**: repositories use the `BASE_URL_PREFIX` / `LOADING_INDICATOR` `HttpContext` tokens, not absolute URLs.
  `encodeURIComponent` path segments; query values go in `params`.
- **Routing**: lazy routes with default-exported components, `title: '<Page> - OSRS Tracker'`; resolvers end with
  `catchError(resolverErrorHandler(<original url>))`. `ParamAwareReuseStrategy` recreates components on param change.
  Adding or renaming a route means updating `src/server/utils/route-label.ts` (its spec fails CI otherwise).

## Design system

Built from the [OSRS Tracker Design canvas](https://claude.ai/artifact/SptGtqgrh6RE8cVzLJJhom) (read it with the
Artifact tool); why it looks like this is in `docs/decisions.md`. Tailwind classes only, no arbitrary `[...]` values: a
value the scale lacks becomes a token in `src/styles/tailwind/theme.css`.

- **Colours:** semantic tokens that swap under `.dark` (`base.css`), never `dark:` pairs: `ground` page, `card`, `line`
  dividers, `row` row lines and hover, `inner` inner tiles, `deep` hero band and icon tiles, `border` controls,
  `muted`/`text`/`strong` text, `accent` (+ `accent-hover`, `on-accent`) links and primary actions, `up`/`down` changes
  (a true green in the dark theme, apart from the emerald accent), `amber`/`orange` warnings. Charts read them through
  `token()` in `chart-setup.ts`, which lists the ones they use.
- **Surfaces:** cards are flat; only floating layers (dropdowns, tooltips, Home's preview card) get `shadow-float`.
  Hover changes the background, never adds a shadow.
- **Radii:** `rounded-3xl` hero surfaces (search box, preview card), `rounded-2xl` cards, stat tiles and buttons in the
  search box, `rounded-xl` inner tiles, inputs and icon tiles, `rounded-full` pills and standalone buttons.
- **Type:** Tailwind's `text-xs`…`text-6xl` with whole-pixel line heights (`text-xl/6`). Page titles
  `text-2xl sm:text-3xl`, landing heroes `text-4xl md:text-5xl` (Home up to `lg:text-6xl`), card titles `text-xl`.
  `tabular-nums` on standalone values only (prices, XP, levels, tiles, axes), never on numbers in text or a page root.
- **Spacing:** steps of 4, 8, 12, 16, 24, 32, 48, 72px; card padding 20px (`px-5`). 24px between cards and sections,
  16px between stat tiles; pages `max-w-page mx-auto px-4 sm:px-6`, 48px from the nav (`pt-12`) and 72px above the
  footer (`pb-18`); reading pages narrow to `max-w-3xl`.
- **Classes** (`components.css`): `.button--primary` (accent) and `.button--default` (outlined), `.button--rounded` for
  standalone ones; `.link` for accent links; `.search-box`/`.search-box-input` for the big search; `.markdown` for
  reading text (changelog, privacy, terms).

Which component to use (`common/components/general/` unless noted):

| Need                                                 | Use                                                                                     |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| A titled section                                     | `article[card]`: 56px header, `[title]` and `[actions]` slots, `subtitle` for two lines |
| A list of players or items                           | `section[list-card]` with its loading, empty and error states; `list-row-skeleton` rows |
| One headline number                                  | `stat-tile` (`compact` for six in a row, `loading`, `tone` for a change)                |
| A choice of views or periods                         | `segmented` (32px pills; `variant="slate"` beside an accent button)                     |
| A whole page's state (not found, unavailable, error) | `status-panel`, with a back button or other actions as content                          |
| Something failed to load                             | `load-error` (default, `panel` or `compact`; see Failures above)                        |
| Something is loading                                 | `skeleton` blocks sized like the content, never a spinner                               |
| A short explanation                                  | `info-tooltip`, or `[tooltip]` on any element                                           |
| A reading page                                       | `information-page` (`common/components/layout/`) around `<div class="markdown">`        |

## Code navigation

Use the `LSP` tool for type info and navigation in `.ts` files, but it's plain TypeScript without Angular's language
service: `findReferences` misses usages in templates (inline or `.html`), such as inputs, outputs, methods and pipes.
Before renaming or deleting a member, grep the templates too (e.g. `grep -rn "(retry)=" src/app`). Go-to-definition
doesn't reach `node_modules`; hover shows library signatures and docs instead.

For Angular API questions, use the `angular-cli` MCP server's `search_documentation` (pass `version: 22`): it searches
the angular.dev docs for the installed major version.

## SSR rules

- **Browser-only APIs**: inject `WINDOW` (null on the server) or `StorageService`, check `isPlatformBrowser`, or use
  `@defer` with a `@placeholder`.
- **CSP**: no inline event handlers either. Any new path that sends page HTML must call `applyCspNonce`, or every script
  is blocked.
- **Response status**: `inject(RESPONSE_INIT, { optional: true })`, not an Express `RESPONSE` token.
- **Transfer cache**: responses reach the browser only if `Cache-Control` has no `no-store`, `no-cache` or `private`;
  otherwise the browser refetches on hydration and resources flash to `defaultValue`. When a page refetches, check the
  API's `Cache-Control` first. Verify in `<script id="ng-state">`: entries are keyed by a hash, not the URL, so look for
  the response body (a news title, an item name), not the path.
- **Chart.js**: shared registrations and the date adapter in `common/components/charts/chart-setup.ts`; load
  browser-only plugins (zoom) lazily per chart; never `Chart.unregister`. Time series charts extend
  `common/components/charts/base-chart.ts`.
- **Icons**: after changing `src/assets/icons/{skills,activities}`, run `npm run icons` and commit
  `local-icons.generated.ts`.
- **Font**: SOLIX comes from the private [FreekMencke/solix](https://github.com/FreekMencke/solix) releases
  (`gh release download -R FreekMencke/solix`); copy `variable/SOLIX-Variable.woff2` to `src/assets/fonts` and bump
  `?v=` in `base.css` and `index.html`.
- **Page cache**: `angular-cache` serves pages pre-rendered by `AutoGenerator` (`serverConfig.autoGeneratedPages`),
  keyed by path (query ignored, trailing slash misses), 2xx only, refreshed on an interval (`/` every 5 min). After an
  API change, wait or restart.

## Tests

Only for complex or important logic, never for coverage. Break the protected code once to confirm the test fails.

- Specs sit next to the code and import from `vitest`.
- Server specs start with `// @vitest-environment node`; follow `src/server/app.spec.ts` and
  `src/server/testing/serve.ts`. `vi.mock` works for packages, not relative imports.
- App specs: `TestBed` with `provideZonelessChangeDetection()` and `HttpTestingController`; clear `localStorage` in
  `afterEach`.

## Running locally

- `npm start` for browser-side work; it has no auto-generator or page cache.
- Server code needs the production build: `HOST=localhost PORT=4200 node dist/osrs-tracker-web/server/server.mjs`. Smoke
  test with `curl -s -D - http://localhost:4200/<path>` (unknown routes 404, generated pages `x-cache: HIT`). Stop with
  `lsof -ti:4200 -sTCP:LISTEN | xargs -r kill`.

## Browser check

For visible or request-changing work, use the Playwright MCP locally and on production after a deploy (curl only sees
server HTML). If it's unavailable, say so rather than falling back to curl silently.

- Dark mode first (the MCP default and most visitors); light mode too for theme changes.
- Send a screenshot (`SendUserFile`) and report request count, failed requests and console errors. For caching, load
  twice and compare.
- Close the browser and delete `.playwright-mcp/` when done.

## Deploy

1. Run the verify command from `CLAUDE.md` (in a release, passing CI counts).
2. `npm run docker:build && npm run docker:push`; commit the regenerated `src/sitemap*.xml`. If `docker` is missing or
   the engine is down, start Docker Desktop from Windows:
   `"/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe" desktop start`
3. Put the pushed digest in `osrs-tracker-web.yaml`'s `image:` line.
4. Confirm the live image matches the yaml, so you don't roll back someone else's deploy:
   `kubectl -n osrs-tracker get deploy osrs-tracker-web -o jsonpath='{.spec.template.spec.containers[0].image}'`
5. `kubectl diff -f osrs-tracker-web.yaml`: only the digest (and `generation`) should change.
6. `kubectl apply -f osrs-tracker-web.yaml && kubectl -n osrs-tracker rollout status deploy/osrs-tracker-web --timeout=300s`
7. Smoke test `https://osrs-tracker.freekmencke.com`: `/` 200 with `x-cache: HIT`, unknown path 404, an item and a
   player page 200, changed pages in the browser, clean
   `kubectl -n osrs-tracker logs deploy/osrs-tracker-web --since=5m`.

Rollback and failure modes: `docs/runbook.md`.

## Release ("release it", "ship it")

Run end to end without asking; stop only on failure. Verify locally once before committing, then CI is the gate.

1. Commit on `<type>/<short-name>`, push, `gh pr create --base main`.
2. Review `gh pr diff` for bugs and leftovers while the `conventions-reviewer` agent checks the PR; fix both and push.
3. In the background, run docker build + push alongside `gh pr checks <n> --watch`.
4. Once CI passes, deploy (steps 3–7).
5. Commit digest and sitemaps, push, and add the digest and smoke-test results to the PR description.
6. When checks pass: `gh pr merge <n> --merge`, switch to `main`, pull, `git branch -d <branch>`, `git fetch --prune`.

## Commit and push

- Conventional commits. Doc-only changes include skills, docs and `CLAUDE.md`. Admin bypasses `main`'s PR rule; after a
  direct push, `gh run watch --exit-status`.
- Commit and push in the same session as a deploy, so production never runs code that isn't on GitHub. A deploy from a
  PR branch runs unmerged code: tell the user, and don't deploy `main` until it's merged.
- `CHANGELOG.md` entries cover deps and tooling too (not Dependabot PRs), newest date first. It's shown on
  `/about/changelog`, so write for users. Busy days get `###` subtitles (user-facing first, "Behind the scenes" last).
  Extend existing entries over near-duplicates; don't repeat the subtitle in entries.
- GPG "Inappropriate ioctl for device": ask the user to run `echo test | gpg --clearsign > /dev/null`, then commit
  within ~10 min.
- If `gh pr edit` fails on a Projects (classic) error, use
  `gh api -X PATCH repos/osrs-tracker/osrs-tracker-web/pulls/<n> -F body=@<file>`.
