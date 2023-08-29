### 2023/08/29

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
