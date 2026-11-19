export const enum StorageKey {
  DarkMode = 'dark-mode',
  /** `granted` or `denied`; `index.html` reads it too, to load Google Analytics on page load */
  AnalyticsConsent = 'analytics-consent',

  XpTrackerRecentPlayers = 'xp-tracker-recent-players',
  XpTrackerFavoritePlayers = 'xp-tracker-favorite-players',
  XpTrackerScrapingOffset = 'xp-tracker-scraping-offset',

  PriceTrackerRecentItems = 'price-tracker-recent-items',
  /** Favourites stay one list across worlds, as they are item ids; the recent ones differ per world */
  PriceTrackerHardcoreRecentItems = 'price-tracker-hardcore-recent-items',
  PriceTrackerFavoriteItems = 'price-tracker-favorite-items',

  /** `YYYY-MM-DD` */
  NewsLastPlayed = 'news-last-played',
}
