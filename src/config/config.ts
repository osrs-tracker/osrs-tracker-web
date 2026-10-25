export const config = {
  siteUrl: 'https://osrs-tracker.net',
  apiBaseUrl: 'https://osrs-tracker-api.freekmencke.com',
  awsBaseUrl: 'https://runescape-api.freekmencke.com',
  /** The OSRS Wiki's real-time prices API, used as its guidelines ask: https://oldschool.runescape.wiki/w/RS:PRICES */
  pricesBaseUrl: 'https://prices.runescape.wiki/api/v2/osrs',
  wikiBaseUrl: 'https://oldschool.runescape.wiki',
  /** Google Analytics 4; `index.html` has it too, as it can't import this file */
  gaMeasurementId: 'G-PSQN8ELKNJ',
  /**
   * The User-Agent of every request the server makes (SSR, link preview images, sitemaps): the repo, as the OSRS Wiki
   * asks for a descriptive one, and so whoever receives our requests knows where to report a problem
   */
  userAgent: 'github:osrs-tracker/osrs-tracker-web',

  maxStoredItems: 6,
  maxStoredPlayers: 6,
};
