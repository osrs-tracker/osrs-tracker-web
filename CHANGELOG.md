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

### 2023/09/11

- Fix problem with hiscore when parsing DT2 bosses.

### 2023/08/30

- Added short description of features on home page.
- Made button styling not specific to button elements. This way it can be used for links as well.
- Made Wiki link on item page an `<a>` element instead of a `<button>` element. This way crawlers can follow the link.

### 2023/08/29

- **It's now possible to select a custom XP scraping offset in the XP Tracker!**
- Improved SOLIX custom font styling.

### 2023/08/28

- Use SOLIX custom font for OSRS Tracker.
- Clamped OSRS news articles to 1 line for title, and 3 lines for body.

### 2023/08/25

- Sitemap index now uses the time the file was last modified as `lastmod`.

### 2023/08/24

- Updated changelogs for previous days because I forgot to do so.
- Added titles to the X/twitter and github svgs.

### 2023/08/19

- Updated all dependencies to their latest versions. No breaking changes.
- Moved hiscore parsing to the `@osrs-tracker/hiscores` package.

### 2023/08/16

- Added skeleton loaders instead of local storage cache
- Added a link to the GitHub repo and twitter account in the upper right of the header.
- Fixed the markdown elements having no styling due to the tailwind css reset.
- Initial `CHANGELOG.md` commit. For now we're not starting versioning yet, because that would be a bit trivial.
