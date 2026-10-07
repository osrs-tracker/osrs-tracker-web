## 2026/10/07

- The item search shows a message with a retry button when searching fails, instead of looking like nothing was found.
- Every page loads a 23% smaller stylesheet: the changelog no longer uses a styling plugin for its text, which also
  fixes a security warning. The changelog's list bullets are easier to see in the light theme.
- Behind the scenes: code changes are formatted automatically and checked for lint and formatting errors before they're
  pushed, and reviewed against the project's conventions before release. The automatic build and tests only run when the
  code or its dependencies change (or the previous run didn't pass), not for releases or documentation, and reuse the
  installed dependencies until they change.
- Behind the scenes: Claude Code gets Angular's documentation for the installed version, and notes on code navigation in
  the project's guide.
- Behind the scenes: removed a deprecated Angular hydration setting that's now on by default.
- Behind the scenes: Claude Code loads a short project summary with the commands and hard rules in every session; the
  project's guide keeps the details without repeating them.

## 2026/10/05

- Player pages show a chart above the logs. Skills: the XP gained per skill over the loaded days, in RuneLite's skill
  colours, with the top 6 shown and the rest toggled from the legend. Other: daily bosses, raids, clues or minigames
  side by side, picked with a category toggle, each coloured after its icon, with the collection log in every category.
  Tooltips show the skill or activity icons.
- Player page layout: the logs are titled "Progress" and line up with the player card; on phones and tablets the clue,
  raid and boss cards are collapsed behind a button, so the progress is closer to the top; phones show short dates, and
  the chart legend shows the top skills with a "+N" chip for the rest. "Last checked" no longer wraps.
- The home page feature previews are replaced by XP and Price Tracker cards, each with the real search and the five most
  recently looked up players or items.
- Updated the SOLIX font to version 2.21, now loaded as a single variable font: one smaller download covers every
  weight.

## 2026/10/04

### Error handling

- Player pages, player cards, item price trends and charts, the recent lookups and the home page news show a message
  with a retry button when loading fails, instead of loading forever or showing empty data.
- Opening a player or item page while the site's data is unavailable shows an error page, instead of the link doing
  nothing.
- The error and not found pages have a button back to the previous page, or to the home page when opened directly.

### Improvements and fixes

- The light theme is softer on the eyes: page backgrounds, cards and inputs are no longer near-white, and greens are
  less bright.
- The feature previews on the home page show the current design, and are sharper on high-resolution screens.
- Updated the font with redesigned S and $ letters.
- Favorite and recently viewed items update right away, and the price tracker reads them from the browser only once.
- The clue scrolls card on player pages no longer shrinks slightly when the hiscores finish loading.
- Item search no longer shows the results of an earlier search when searching quickly.
- Damaged tracker data saved in the browser no longer crashes the price tracker or makes player pages show "not found".
- Site updates no longer cause brief errors while they roll out.

### Performance

- Fonts are no longer downloaded twice.
- Skill, boss, raid and clue icons come with the player page instead of as about a hundred separate downloads.
- Skill icons and homepage images are cached by the browser instead of downloaded again on every visit.

### Security and privacy

- Tightened the security policy: scripts can no longer be generated from text at runtime, and scripts that aren't part
  of the site can no longer run on its pages.
- Server logs record the visitor's IP address, the referring page and the response size, to spot and block abuse.
- Updated the privacy policy: logs include IP addresses and are kept for up to 30 days for security, generally without
  deletion on request; attacking IP addresses are shared with CrowdSec's community blocklist; and it explains how to
  exercise your GDPR rights.

### Behind the scenes

- Removed the old offline mode (disabled since April 2025), including the cleanup step for browsers that still had it
  installed.
- Server monitoring groups requests by page type (e.g. all player pages together) instead of by URL.
- The server runs with fewer permissions, is taken out of service automatically when it stops responding, and shuts down
  cleanly during updates.
- Server-side page renders no longer share requests with each other.
- Updated the web server to Express 5, the code checking and testing tools, and the changelog renderer.
- Automatic security updates for dependencies; removed unused code and dependencies.
- Simplified the player and item page code; the home page news, changelog and loading bar use the shared data loading
  code, and the price and volume charts share their setup code.
- Project skill: documented the changelog conventions (`###` subtitles on busy days, no near-duplicate entries).
- Automated tests for the page cache, page pre-rendering, request handling, monitoring, page errors and removing players
  that no longer exist.

## 2026/10/03

### Player pages

- Added clue scroll, raid and boss kill cards. The boss card lists every boss, with a dash for bosses without a kill
  count on the hiscores.
- Redesigned the skill logs: one line per skill with right-aligned numbers, and the total XP and levels gained in the
  header of each day.
- Bigger, sharper icons in the skill and other logs, and sharper skill and activity icons elsewhere.
- Days without progress, including a single day or today, show as a muted outlined card, and consecutive ones are
  combined into one compact row.
- Numbers in the logs are no longer bold.
- The favorite button (also on item pages) is now a star icon at the top of the page, and the Old School Hiscores button
  an external link icon.
- Fixed icons sometimes failing to load.
- Fixed extra spacing above "Nothing interesting happened." in the Other logs.

### Site-wide

- Updated the font, which now has a medium weight and equal-width digits, so numbers line up in columns.
- Fixed some invalid page addresses returning a server error instead of a 404.

### Server

- The ingress runs on Traefik (ingress-nginx is retired); the rate limits moved to Traefik Middlewares with the same
  values.
- Fixed a flood of proxy header warnings in the logs since that move; a client-sent Forwarded header is now dropped at
  the ingress.
- Fixed a deprecation warning in the logs.

### Behind the scenes

- Removed unused dependencies, and unused development tools that pulled in packages with known security issues.
- Documented the new pull request workflow and the release flow for developers.

## 2026/10/02

### Fixes

- The latest news and other data no longer briefly reload after the page has loaded.
- Pages update when navigating between items or players.
- Charts no longer show data for the wrong time span after quickly switching.
- Unknown pages, items and players return a proper 404 status.
- Searching for items or players with special characters in their name works.
- Loading spinners no longer get stuck when a request fails (player pages and the home page news followed on
  2026/10/04).
- The favorite player toggle is reported correctly in analytics.

### Other changes

- Added a page title to the changelog.
- Updated to Node 24 and updated dependencies, including the latest shared OSRS Tracker packages.
- Expanded the README with features, how the project fits together, and how to run it locally.
- Updated the developer documentation for working across the OSRS Tracker projects.

## 2026/09/26

- Updated the hiscores package to fix a `hiscoreDiff` bug.

## 2026/09/23

- Updated the XP Tracker to use structured hiscore data.
- Added skill and activity icons to player details and XP Tracker logs.

## 2026/07/29

- Added support for the new `Mad Angel` hiscore category.

## 2026/07/26

- Updated to Angular 22.
- Fixed players who changed their name not being removed from the XP Tracker.
- Fixed using the back button from the 404 page not working correctly in the XP Tracker.

## 2026/06/30

- Added support for the new `Maggot King` hiscore category.

## 2026/05/11

- Fixed an issue where the 404 page would flash before loading the correct page.

## 2026/05/06

- dependency updates

## 2026/02/25

- Added support for the new `Brutus` hiscore category.

## 2026/02/24

- Updated to Angular 21.
- Updated all dependencies to their latest versions.

## 2025/11/19

- Added support for the new `Sailing` hiscore category.

## 2025/11/18

- Prepped the skills component for the upcoming Sailing skill addition.
- Added skill progress bars to display progress to next level for each skill.

## 2025/11/05

- Added support for the new `Shellbane Gryphon` hiscore category (Sailing pre-release).

## 2025/10/15

- Make XP Tracker compatible with Grid Master changes.

## 2025/09/24

- Added a button to the XP Tracker to open the player's hiscore page on the official OSRS website.

## 2025/07/23

- Added support for the new `Doom of Mokhaiotl` hiscore category.

## 2025/06/14

- Updated to Angular 20.
- Updated all dependencies to their latest versions.
- increased displayed global/favorite item count in the main Price Tracker and XP Tracker to `6`.

## 2025/05/14

- Add support for the `Yama` hiscore category.

## 2025/05/04

- Fix feature image/text order on home page.
- Add fallback from item image to item icon if the item image is not available.

## 2025/04/29

- Made it possible to use `Enter` to submit the search form in the XP Tracker.
- Disabled form autocomplete in the Price Tracker and XP Tracker.

## 2025/04/27

- SSR will not send a 404 response when the page is not found, instead of a soft 404 page with a 200 response.
- SSR will now dismiss queryParams when checking for cached pages.

## 2025/04/24

- Improved Xp Tracker SSR page loading speed by deferring the OSRS Hiscore calls to the client side.
- Made spinner more understandable to search engines.
- TailwindCSS v4 migration.
- Changed to the new News API endpoints.

## 2025/04/19

- Use new API to prevent AWS Lamda cold starts.

## 2025/04/15

- Fixed a bug where when the SSR fails the error could not be caught and the page would not load.
- Added a fallback to non-SSR if the SSR fails (index.csr.html).
- Moved health check and metrics to a separate port (9090).
- Updated Dockerfile and Kubernetes configuration to reflect the new metrics port.

## 2025/04/14

- Refactored the `server.ts` file to a fully fleshed out `express` server folder structure.
- Created `utils/page-cache.ts`, `utils/auto-generator.ts` and `server-config.ts` for automatically pre-rendering pages
  and caching them.

## 2025/04/13

- Migrated to Angular SSR
- Temporarily disabled Angular Service Worker to prevent CSP and caching issues.
- Minor changes in logic to allow for SSR.

## 2025/04/05

- Added new section to Price Tracker: `Global recent lookups`.
- Added new section to XP Tracker: `Global recent lookups`.

## 2025/02/05

- Add support for the new `The Royal Titans` hiscore category.

## 2025/01/29

- Add support for the new `Collection Log` hiscore category.
- Updated copyright to 2025.

## 2025/01/05

- Fix `eslint` not linting any files anymore.

## 2024/12/30

- Deferred `price-chart` and `volume-chart` loading to improve page load time, plus minor chart style changes.
- Renamed xp-tracker search field from `username` to `player name` to prevent password manager code injection.
- Improved tooltip performance by using `passive: true`.
- Replaced bad `/changelog` route with `/about/changelog`.
- Used `div` instead of `p` for `page-header` content to be semantically correct.

## 2024/12/28

- minor config changes.

## 2024/12/14

- fix minor styling issues
- update @angular-eslint to a non alpha version

## 2024/11/29

- Updated to Angular 19
- Executed all new possible Angular migrations
- Updated all dependencies to their latest versions

## 2024/09/25

- Varlamore Part 2 support

## 2024/09/14

- update dependencies

## 2024/08/28

- Arraxor support

## 2024/05/23

- Updated to Angular 18
- Updated all dependencies to their latest versions
- Use zoneless change detection, removed zone.js
- Use new signal input/output/... notation

## 2024/04/06

- Add missing colliseum glory icon

## 2024/03/20

- Varlamore p1 support

## 2024/02/28

- Added xp tooltips to the skills overview in xp tracker

## 2024/02/27

- updated dependencies
- fixed issue where tooltip arrows would be misaligned a bit.

## 2024/02/25

- remove players that are missing from the hiscores from the xp tracker (name change, banned, etc)

## 2024/02/07

- skill overview in xp tracker

## 2024/01/24

- Fix scurrius being added breaking hiscores

## 2023/12/16

- Add "Load more data" button to the XP Tracker if you want to see older data. By default only max `60` days of data is
  stored.

## 2023/12/15

- Show which skills have leveled up in the XP Tracker.
- Add optional localStorage setting `traffic_type` that will be used to determine the traffic type for the Google
  Analytics tracker.
- updated `@angular` to `v17.0.7` and other dependencies as well.

## 2023/11/12

- Update @angular to `v17.0.4`.
  - Refactored all `NgIf` and `NgFor` instances to the new control flow.
- Updated all other dependencies to their latest versions. No breaking changes.

## 2023/09/11

- Fix problem with hiscore when parsing DT2 bosses.

## 2023/08/30

- Added short description of features on home page.
- Made button styling not specific to button elements. This way it can be used for links as well.
- Made Wiki link on item page an `<a>` element instead of a `<button>` element. This way crawlers can follow the link.

## 2023/08/29

- **It's now possible to select a custom XP scraping offset in the XP Tracker!**
- Improved SOLIX custom font styling.

## 2023/08/28

- Use SOLIX custom font for OSRS Tracker.
- Clamped OSRS news articles to 1 line for title, and 3 lines for body.

## 2023/08/25

- Sitemap index now uses the time the file was last modified as `lastmod`.

## 2023/08/24

- Updated changelogs for previous days because I forgot to do so.
- Added titles to the X/twitter and github svgs.

## 2023/08/19

- Updated all dependencies to their latest versions. No breaking changes.
- Moved hiscore parsing to the `@osrs-tracker/hiscores` package.

## 2023/08/16

- Added skeleton loaders instead of local storage cache
- Added a link to the GitHub repo and twitter account in the upper right of the header.
- Fixed the markdown elements having no styling due to the tailwind css reset.
- Initial `CHANGELOG.md` commit. For now we're not starting versioning yet, because that would be a bit trivial.
