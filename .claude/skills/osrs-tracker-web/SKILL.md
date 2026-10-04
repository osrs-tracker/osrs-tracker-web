---
name: osrs-tracker-web
description:
  Angular 22 SSR conventions, the SSR transfer-cache and page-cache pitfalls, local runs, the Docker/Kubernetes deploy
  and the commit rules for osrs-tracker-web. Use when writing or reviewing code in this repo, debugging data that
  refetches or flashes after load, running it locally, or building, deploying, committing, pushing, releasing or
  shipping it.
---

# osrs-tracker-web

Angular 22 SSR app (zoneless, signals, standalone) served by a custom Express server, deployed as a Docker image to
Kubernetes.

## Related repos

The API (`../osrs-tracker-api`) and the Lambdas and shared packages (`../osrs-tracker-aws`) each have their own skill.
When a separate Claude session owns one of them, send changes there instead of editing it from here.

- **External endpoints** (`src/config/config.ts`, hard-coded to production):
  - `apiBaseUrl`: osrs-tracker-api. It's called during SSR, so its `Cache-Control` matters (see SSR rules).
  - `awsBaseUrl`: an API Gateway proxy to Jagex's hiscores. It's only called **in the browser** (`player-detail` behind
    `isPlatformBrowser`, and `player-widget`), so its `no-cache` doesn't affect SSR. The API and a Lambda use the same
    proxy, so changes to it need checking from all three repos.
  - `pricesBaseUrl`: prices.runescape.wiki (third party).
- **Shared packages** `@osrs-tracker/models` and `@osrs-tracker/hiscores` are published from osrs-tracker-aws.
  `hiscores` peer-depends on `models`, so **bump both together**, with `--prefer-online` right after a publish (the
  registry's dist-tags lag). Type-only bumps don't need a deploy.
- Use **ToxSick** (the maintainer's old account) as the test player for production checks.

## Layout

- `src/app/common/repositories/`: all HTTP access. `src/app/core/`: interceptors, the route reuse strategy, error
  handling, the `WINDOW` token.
- `src/app/features/<feature>/`: routed features with their own `*.routes.ts`, resolvers and sub-components.
- `src/server/`: the Express server: `app.ts` (middleware chain, Angular handler, error handler), `middleware/`
  (`angular-cache`, logging, metrics, security), `utils/` (`auto-generator`, `page-cache`), `server-config.ts`.

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

## SSR rules (important)

- **Browser-only APIs** (`window`, `localStorage`, canvas): inject `WINDOW` (null on the server) or `StorageService`,
  check `isPlatformBrowser`, or put the UI inside `@defer` (it renders nothing on the server; add a `@placeholder` to
  avoid layout shift).
- **Response status**: set it with `inject(RESPONSE_INIT, { optional: true })` (null in the browser). Don't use an
  Express `RESPONSE` token.
- **HTTP transfer cache**: server-side responses are only handed to the browser if their `Cache-Control` has **no**
  `no-store`, `no-cache` or `private`. Otherwise the browser refetches on hydration and resources flash back to their
  `defaultValue`. When a page refetches after load, check the API's `Cache-Control` before changing anything here.
  Verify by parsing `<script id="ng-state">`: HTTP entries have a `u` field, and slashes in it are escaped as `\u002F`,
  so grep for `\u002Fnews`, not `/news`.
- **Chart.js**: shared registrations live in `charts/chart-setup.ts` (imported for its side effects). Load browser-only
  plugins (zoom) lazily and pass them per chart via `plugins`; never `Chart.unregister` in `ngOnDestroy`.
- **Icons**: the skill and activity icons are also bundled as data URIs in `local-icons.generated.ts`, which
  `PlayerDetailComponent` provides via `LOCAL_ICONS` (the server keeps file URLs). After adding or changing an icon in
  `src/assets/icons/{skills,activities}`, run `npm run icons` and commit the result (`build` regenerates it too).
- **Page cache**: `angular-cache` serves pages pre-rendered by `AutoGenerator` (paths in
  `server-config.ts → autoGeneratedPages`), keyed by path, so query strings are ignored and a trailing slash misses. It
  only caches 2xx renders. Cached pages are refreshed on an interval (`/` every 5 min), so after an API change either
  wait for the next interval or restart the server.

## Verify before handing off

```bash
npx ng build --configuration production && npx ng lint && npx prettier --check src && npx ng test --watch=false
```

CI (`.github/workflows/nodejs.yml`) runs lint, `prettier:ci`, build and test on every PR to and push to `main`.

## Running locally

- **The API's CORS only allows `http://localhost:4200`.** Any other port renders server-side fine, but browser API calls
  fail.
- `npm start` (`ng serve --open`): fast reload for browser-side work. It does **not** start the auto-generator or page
  cache, because `server.ts` only runs them when it's the main module.
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

## Release ("release it", "ship it")

When the user asks to release or ship, run the whole flow without asking for confirmation between steps. Stop and report
only if a step fails.

1. **PR**: commit on a `<type>/<short-name>` branch (code, `CHANGELOG.md`), push it and `gh pr create --base main`.
2. **Review the PR's code** (`gh pr diff`): look for bugs, convention violations and leftovers, fix what you find, and
   re-run the verification steps.
3. **Deploy to production** following the deploy steps below, including the smoke test.
4. **Update the PR** with the deploy changes: commit the image digest bump and the regenerated sitemaps to the branch,
   push, and record the deployed digest and the smoke-test results in the PR description. `gh pr edit` can fail on a
   Projects (classic) GraphQL error; use `gh api -X PATCH repos/osrs-tracker/osrs-tracker-web/pulls/<n> -F body=@<file>`
   instead.
5. **Merge** once everything is fine and all checks pass (`gh pr checks <n> --watch`): `gh pr merge <n> --merge`, then
   `git switch main && git pull --ff-only`, `git branch -d <branch>` and `git fetch --prune`.

## Commit and push

- For releases, follow the flow above. Documentation-only changes (skills, docs, no code or deploy) go straight to
  `main`. Otherwise, **ask the user whether to commit straight to `main` or open a PR**, every time, before committing.
  `main` requires a PR and passing `build`, `lint` and `test` checks (no approvals), which the user's admin account can
  bypass, so a direct push works and shows a "bypassed rule violations" notice.
  - Straight to `main`: push, then watch the CI run (`gh run watch --exit-status`).
  - PR: commit on a `<type>/<short-name>` branch, push it, `gh pr create --base main` and check `gh pr checks`. Once the
    user says it's merged, `git switch main && git pull --ff-only`, delete the local branch with `git branch -d` and
    `git fetch --prune` (GitHub deletes the remote branch on merge).
  - Deploying from a PR branch leaves production running unmerged code: tell the user, and don't deploy from `main`
    until the PR is merged.
- Use conventional commits (`fix(scope): …`, `feat(scope): …`). Include the image digest bump and the regenerated
  sitemaps in the same commit as the code they deploy.
- **Every change gets a `CHANGELOG.md` entry**, including dependency and tooling updates. Use a `## YYYY/MM/DD` heading
  (newest first; add to today's heading if it already exists) followed by short bullets. It's rendered on
  `/about/changelog` from GitHub `main`, so write the bullets for users, not developers.
- Commits are GPG-signed. If signing fails with "Inappropriate ioctl for device", ask the user to unlock the key in
  their own terminal (`echo test | gpg --clearsign > /dev/null`), then commit right away: the cache lasts about 10
  minutes. Never use `--no-gpg-sign`.
- Push over HTTPS via `gh` (`gh auth setup-git` is configured). If `gh auth status` fails, ask the user to log in.
- Deploying without committing leaves production running code that isn't on GitHub, so commit and push in the same
  session as the deploy.
