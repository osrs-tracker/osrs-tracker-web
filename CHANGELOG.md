## 2026/10/07

- First step of the new look: refreshed colours in both themes (a lighter page in the light theme), flat cards with
  rounded corners and bigger headings, pill-shaped switches for periods and views, and restyled buttons, inputs, info
  tooltips and charts. Failed loads say what went wrong with a "Try again" button. Changes up are a brighter green, and
  numbers in text are no longer spaced out like the values in tables.
- A new navigation bar and footer. On phones, Home, XP Tracker and Price Tracker sit side by side as tabs under the
  logo, with the current page underlined, instead of behind a menu button. The loading bar is a thin sweep that only
  shows when loading takes a moment, and stands still if you've asked your device to reduce motion. The GitHub link
  moved to the footer and the X/Twitter link is gone.
- New player and item lists on Home and the trackers. Each list is a card with a short description and, for your own
  lists, a count. Players show their account type, total level and the XP gained since they were last tracked, or "No XP
  gained". Items show a short price ("1.4M gp", the full price on hover) and their change since yesterday as a green or
  red percentage. Lists show placeholder rows while loading instead of a spinner, and items whose price fails to load
  now say so with a retry button instead of showing a dash. Prices on the item charts use the same short form ("1.61B",
  "2.54K").
- New XP Tracker and Price Tracker pages: a header with a bigger search box, and your recent lookups and favourites as
  three equal lists below it. On the XP Tracker the tracking offset sits under the search and says which hour's hiscores
  you're seeing. The item search shows each match's price, and says so when nothing matches.
- A new Home page: one big search for players or items, with the tracking offset under it for players and your first
  three favourite items for items, next to an example of a player's stats. The latest news cards are clickable as a
  whole, and the XP Tracker and Price Tracker cards list the five most recent lookups with a link to open each tracker.
- A new item page: a header with the item's icon, its name linking to the OSRS Wiki, the examine text and the instant
  sell price with its change since yesterday, then six tiles with the instant buy and sell prices, the margin after GE
  tax, the daily volume, the buy limit and the high alch value. The price chart switches between the last day, week,
  month and year, and the daily volume shows what was bought and sold over the last 14 days. A new profit calculator
  works out the profit of flipping or high alching the item, using the Grand Exchange's 2% tax (rounded down, at most 5M
  per item, none on exempt items like bonds). Prices show placeholders while loading, and a link to an unknown item
  offers a search instead of the 404 page. The trend card is gone; the year view covers it.
- A new player page layout. The header shows the account type (tap it for details on a phone), the name linking to the
  official hiscores, the combat level and how far back the history goes. Four tiles sum up the total level and rank, the
  XP gained in the last 7 days compared with the week before, the levels gained and the boss kills. Skills, bosses and
  raids share one card with tabs, and clues and minigames another; picking a skill, a tab or an activity switches the
  chart to it, and you can pick several skills to compare them. Skills show their progress to the next level, and
  activities with gains are outlined in their chart colour. Minigames only list what the player is ranked in, Legacy
  Bounty Hunter and Deadman points get an icon instead of a broken image, and only running totals (Rifts closed, Soul
  Wars Zeal, Bounty Hunter) are charted. The day log lists XP, levels and activity gains together. When the hiscores
  aren't responding, a notice says how old the stats are. A player who doesn't exist gets a search box to try another
  name, and a player whose tracking just started gets an explanation instead of an empty chart.
- New player charts. Pick the last 7, 30 or 60 days: the chart and the XP, levels and boss kill tiles all follow, with
  the XP compared to the period before. Above the chart, what it shows and its total for the period, such as "Total XP
  gained +3.72M" or "Zulrah kills, kill count 4,812". XP gained is a running total: Overall on its own, or one line per
  skill you pick, with chips under the chart to add or remove skills and the day's gain on hover. Bosses, raids and
  clues show each day's gains stacked per activity, with chips to hide or show them. Minigames chart one running total
  at a time.
- The dotted background behind the Home, XP Tracker and Price Tracker headers is easier to see in the light theme.
- The item search shows a message with a retry button when searching fails, instead of looking like nothing was found.
- Every page loads a 23% smaller stylesheet: the changelog no longer uses a styling plugin for its text, which also
  fixes a security warning. The changelog's list bullets are easier to see in the light theme.
- The XP gained in the recently looked up players lists is measured from your selected tracking offset. Players tracked
  at more than one offset could show the XP gained since another offset's last update.
- The recently looked up items and players lists only show what people looked up, not what search engines and other bots
  visited, and bots no longer start tracking new players. Lookups are recorded by your browser once the page has loaded.
  A newly tracked player's first entry shows up on their page right away.
- Updated the SOLIX font to version 2.22: minus signs and arrows now use the site font, so negative changes like "−0.6%"
  are the same width and height as positive ones.
- Behind the scenes: the security policy no longer allows background workers, a leftover from the service worker that
  was turned off in 2025.
- Behind the scenes: updated the shared OSRS Tracker data models and hiscores packages, preparing for the player page's
  "History since" date and a notice when the hiscores aren't responding.
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
