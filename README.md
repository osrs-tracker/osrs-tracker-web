<p align="center">
  <a href="https://github.com/osrs-tracker/osrs-tracker-web/actions/workflows/nodejs.yml"><img src="https://github.com/osrs-tracker/osrs-tracker-web/actions/workflows/nodejs.yml/badge.svg" /></a>
  <a href="https://github.com/osrs-tracker/osrs-tracker-web/issues"><img src="https://img.shields.io/github/issues/osrs-tracker/osrs-tracker-web.svg" /></a>
</p>

<div align="center">
  <a href="https://osrs-tracker.freekmencke.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="src/favicon-dark.png">
      <img alt="OSRS Tracker" src="src/favicon.png">
    </picture>
    <div>Visit OSRS Tracker</div>
  </a>

  <br />

  <p align="center">Keep track of everything that matters in Old School RuneScape. <br>Track the latest news, item prices, hiscores, and XP gains.</p>
</div>

## Features

- **XP Tracker**: look up any player and follow their daily XP gains, levels, boss kills, clue scrolls and more. Keep a
  list of your favourite players to check on your (and your friends') progress.
- **Price Tracker**: search any tradeable item and see its current Grand Exchange price, trends, and price and volume
  charts from the last day up to the last year.
- **OSRS News**: the latest Old School RuneScape news on the home page.

## How it fits together

This repository is the website. It is one of three parts:

- **[osrs-tracker-web](https://github.com/osrs-tracker/osrs-tracker-web)** (this repo): the website at
  [osrs-tracker.freekmencke.com](https://osrs-tracker.freekmencke.com).
- **[osrs-tracker-api](https://github.com/osrs-tracker/osrs-tracker-api)**: the API that serves player, item and news
  data to the website.
- **[osrs-tracker-aws](https://github.com/osrs-tracker/osrs-tracker-aws)**: background jobs that save a daily snapshot
  of every tracked player and keep the item list up to date, plus shared packages.

Live hiscores come from the official Old School RuneScape hiscores, and prices come from the
[OSRS Wiki prices API](https://prices.runescape.wiki).

## Running it locally

You need Node 24.

```bash
npm ci
npm start
```

The site runs at [localhost:4200](http://localhost:4200) and uses the live API. Run it on port 4200, because the API
only accepts requests from that address when running locally.

## Contributing

Local runs use the production API, so player lookups show up in the live "Global recent lookups".

```bash
npm run lint
npm run prettier
npm test
```

`npm start` doesn't run the server code (page cache, pre-rendering). To test that, build and run the production server:

```bash
npm run build
HOST=localhost PORT=4200 node dist/osrs-tracker-web/server/server.mjs
```

Conventions, the deploy and the release flow are in
[.claude/skills/osrs-tracker-web/SKILL.md](.claude/skills/osrs-tracker-web/SKILL.md).

## Built with

Angular with server-side rendering, Tailwind CSS and Chart.js, running on Node 24 in Docker on Kubernetes.

## Development

OSRS Tracker was originally built entirely without AI assistance. Since October 2026, I've started using
[Claude](https://claude.com/claude-code), Anthropic's AI coding assistant, to help improve development speed and
reliability.

## License

[Apache 2.0](LICENSE)
