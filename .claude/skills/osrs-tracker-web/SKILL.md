---
name: osrs-tracker-web
description:
  Conventions, Angular 22 / SSR best practices, verification and the deploy workflow for osrs-tracker-web. Use when
  writing or reviewing code in this repo, running it locally, or building, deploying, committing or pushing it.
---

# osrs-tracker-web

Angular 22 SSR app (zoneless, signals, standalone) served by a custom Express server, deployed as a Docker image to
Kubernetes.

## The system and who owns what

OSRS Tracker is three repos, each with its own project skill and its own Claude session:

| Repo                      | What                                                                         | Worked on by                          |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------- |
| `osrs-tracker-web` (this) | the website                                                                  | this session, which also orchestrates |
| `../osrs-tracker-api`     | NestJS API on MongoDB Atlas, same k8s cluster                                | the "OSRS Tracker API" session        |
| `../osrs-tracker-aws`     | Lambda jobs (queue/scrape players daily, refresh items), shared npm packages | the "OSRS Tracker AWS" session        |

- **Delegate all API and AWS work to their sessions** (SendMessage): code, packages, deploys, commits. Reading those
  repos for context is fine. Give each task the context it needs from the other repos, sequence cross-repo changes,
  relay findings, and verify end to end from the web side. If a session is blocked by its own permissions, report that
  to the user; never do the work from here instead.
- **External endpoints the web uses** (`src/config/config.ts`):
  - `apiBaseUrl`: osrs-tracker-api. It's used during SSR, so its `Cache-Control` matters (see SSR rules).
  - `awsBaseUrl` = `runescape-api.freekmencke.com`: an API Gateway proxy to Jagex, console-managed in the AWS account.
    The web only calls it **in the browser** (live "today" hiscores in `player-detail` behind `isPlatformBrowser`, and
    the localStorage-backed `player-widget`), so its `no-cache` doesn't affect SSR. The API and the process-players
    Lambda use the same proxy, so proxy changes need a check from all three.
  - `pricesBaseUrl`: prices.runescape.wiki (third party).
- **Shared packages** `@osrs-tracker/models` and `@osrs-tracker/hiscores` are published from osrs-tracker-aws (the user
  publishes with an npm OTP). `hiscores` peer-depends on `models`, so **bump both together in the web** and use
  `--prefer-online` right after a publish (the CDN dist-tags lag). Type-only bumps don't need a deploy.
- **Paused players**: the Lambda pauses scraping after 7 days of hiscore 404s (`scrapingOffsets` →
  `pausedScrapingOffsets`), and the API resumes it on a successful lookup. The web needs nothing for this: a paused
  player's page 404s through the API refresh, and `isPlayerTracked` only reads `scrapingOffsets`.
- **Test player** for production checks: **ToxSick** (the user's old account).

## Layout

- `src/app/core/`: app-wide plumbing: `interceptors/`, `routing/` (route reuse strategy), `error-handling/`, `platform/`
  (`WINDOW` token).
- `src/app/common/`: shared `components/`, `directives/`, `pipes/`, `services/`, `helpers/`, and `repositories/` (all
  HTTP access).
- `src/app/features/<feature>/`: routed features with their own `*.routes.ts`, resolvers and sub-components.
- `src/server/`: Express server: `app.ts` (middleware chain, Angular handler, error handler), `middleware/`
  (`angular-cache`, logging, metrics, security), `utils/` (`auto-generator`, `page-cache`), `server-config.ts`.
- `src/config/config.ts`: API base URLs (hard-coded to production) and chart colors.

## Angular conventions

Match the surrounding code; these are the patterns the codebase already uses:

- **DI**: `inject()` only, never constructor injection. Root services use `@Service()` (Angular 22), not
  `@Injectable({ providedIn: 'root' })`.
- **State**: signals everywhere: `input()` / `input.required()`, `signal`, `computed`, `linkedSignal`. Explicitly type
  public signal fields (`readonly foo: Signal<Bar> = computed(...)`).
- **Async data**: prefer `httpResource` / `rxResource` (they cancel stale requests when params change) over manual
  `subscribe` + `signal.set`. If you do subscribe, handle errors and reset loading state with `finalize`, so a failed
  request can't leave a spinner running.
- **HTTP**: all calls go through a repository in `common/repositories/`. Use `HttpContext` tokens (`BASE_URL_PREFIX`,
  `LOADING_INDICATOR`) instead of building absolute URLs. Encode path segments with `encodeURIComponent`, and pass query
  values via `params`.
- **Routing**: lazy `loadComponent` / `loadChildren` with **default-exported** route components; the route `title` is
  `'<Page> - OSRS Tracker'`. Resolvers turn a 400/404 into `router.navigate(['**'])` followed by
  `loc.replaceState(<original url>)`. `ParamAwareReuseStrategy` recreates components when route params change, so
  components can load data on init.
- **Templates**: built-in control flow (`@if`, `@for` with `track`, `@defer`), Tailwind classes. Component selectors are
  unprefixed kebab-case and directive selectors unprefixed camelCase (enforced by ESLint).
- **No `console`** in app code (ESLint `no-console`); server files that log use `/* eslint-disable no-console */`.

## SSR rules (important)

- **Browser-only APIs** (`window`, `localStorage`, canvas): inject `WINDOW` (null on the server) or `StorageService`,
  check `isPlatformBrowser`, or put the UI inside `@defer` (it renders nothing on the server; add a `@placeholder` to
  avoid layout shift).
- **Response status**: set it with `inject(RESPONSE_INIT, { optional: true })` (null in the browser). Don't use an
  Express `RESPONSE` token.
- **HTTP transfer cache**: server-side responses are only handed to the browser if their `Cache-Control` has **no**
  `no-store`, `no-cache` or `private`. Otherwise the browser refetches on hydration and resources flash back to their
  `defaultValue`. When a page refetches after load, check the API's `Cache-Control` before changing anything here.
  Verify by parsing `<script id="ng-state">`: HTTP entries have a `u` field, and slashes in it are escaped as `/`, so
  grep for `/news`, not `/news`.
- **Chart.js**: shared registrations live in `charts/chart-setup.ts` (imported for its side effects). Load browser-only
  plugins (zoom) lazily and pass them per chart via `plugins`; never `Chart.unregister` in `ngOnDestroy`.
- **Page cache**: `angular-cache` serves pages pre-rendered by `AutoGenerator` (paths in
  `server-config.ts → autoGeneratedPages`), keyed by path, so query strings are ignored and a trailing slash misses. It
  only caches 2xx renders. Cached pages are refreshed on an interval (`/` every 5 min), so after an API change either
  wait for the next interval or restart the server.

## Verify before handing off

```bash
npx ng build --configuration production
```

```bash
npx ng lint
```

```bash
npx prettier --check src
```

```bash
npx ng test --watch=false
```

CI (`.github/workflows/nodejs.yml`) runs lint, `prettier:ci`, build and test on every push to `main`.

## Running locally

- **The API's CORS only allows `http://localhost:4200`.** Any other port renders server-side fine, but browser API calls
  fail.
- `npx ng serve` (skip `--open` on WSL): fast reload for browser-side work. It does **not** start the auto-generator or
  page cache, because `server.ts` only runs them when it's the main module.
- Production SSR build, which is the only way to exercise the server code (`angular-cache`, auto-generator, error
  handler):

  ```bash
  HOST=localhost PORT=4200 node dist/osrs-tracker-web/server/server.mjs
  ```

  Smoke test with `curl -s -D - http://localhost:4200/<path>`: check the status (unknown routes must return 404) and
  `x-cache` (HIT for auto-generated pages). Stop it with `lsof -ti:4200 -sTCP:LISTEN | xargs -r kill`.

## Deploy (Docker → Kubernetes)

1. Pass the verification steps above.
2. Build and push. `predocker:build` regenerates `src/sitemap.xml` and `src/sitemap-site.xml`; commit those as well.

   ```bash
   npm run docker:build && npm run docker:push
   ```

3. Copy the pushed digest (`latest: digest: sha256:…`) into the `image:` line of `osrs-tracker-web.yaml`
   (`freekmencke/osrs-tracker-web@sha256:…`).
4. Before changing anything, check that the live image matches the yaml, so you don't roll back someone else's deploy:

   ```bash
   kubectl -n osrs-tracker get deploy osrs-tracker-web -o jsonpath='{.spec.template.spec.containers[0].image}'
   ```

5. **Review the diff before applying.** Applying without reviewing is blocked. Expect only the image digest (plus a
   `generation` bump):

   ```bash
   kubectl diff -f osrs-tracker-web.yaml
   ```

6. Apply and wait:

   ```bash
   kubectl apply -f osrs-tracker-web.yaml && kubectl -n osrs-tracker rollout status deploy/osrs-tracker-web --timeout=300s
   ```

7. Smoke test production (`https://osrs-tracker.freekmencke.com`): `/` returns 200 with `x-cache: HIT`, an unknown path
   returns 404, an item and a player page return 200, and the pod logs are clean:

   ```bash
   kubectl -n osrs-tracker logs deploy/osrs-tracker-web --since=5m
   ```

Production sets `HOST=osrs-tracker.freekmencke.com`; the Angular app engine's `allowedHosts` and the auto-generator's
render URL both depend on it.

## Commit and push

- Commit straight to `main` with conventional commits (`fix(scope): …`, `feat(scope): …`; commitizen is configured).
  Include the image digest bump and the regenerated sitemaps in the same commit as the code they deploy. `main` has
  rulesets (PRs, required checks) that the user's account bypasses; pushing straight to `main` is the chosen workflow,
  so the "bypassed rule violations" notice is expected. Watch the CI run after pushing (`gh run watch`).
- GPG's passphrase cache lasts about 10 minutes. When several sessions need to commit, tell them as soon as the user has
  unlocked the key, so all commits land in the same window.
- **Every change gets a `CHANGELOG.md` entry**, including dependency and tooling updates. Use a `## YYYY/MM/DD` heading
  (newest first; add to today's heading if it already exists) followed by short bullets. It's rendered on
  `/about/changelog` from GitHub `main`, so write the bullets for users, not developers.
- Commits are GPG-signed. If signing fails with "Inappropriate ioctl for device", ask the user to unlock the key in
  their own terminal (`echo test | gpg --clearsign > /dev/null`); never use `--no-gpg-sign`.
- Push over HTTPS via `gh` (`gh auth setup-git` is configured). If `gh auth status` fails, ask the user to log in.
- Deploying without committing leaves production running code that isn't on GitHub, so commit and push in the same
  session as the deploy.
