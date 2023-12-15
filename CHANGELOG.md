## 2023/12/15

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
