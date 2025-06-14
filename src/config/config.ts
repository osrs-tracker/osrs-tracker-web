export const config = {
  apiBaseUrl: 'https://osrs-tracker-api.freekmencke.com',
  awsBaseUrl: 'https://runescape-api.freekmencke.com',
  pricesBaseUrl: 'https://prices.runescape.wiki',
  wikiBaseUrl: 'https://oldschool.runescape.wiki',

  chart: {
    dark: {
      buyColor: '#f59e0b',
      sellColor: '#10b981',

      tickColor: '#ffffff',
      gridColor: '#475569',
    },
    light: {
      buyColor: '#d97706',
      sellColor: '#059669',

      tickColor: '#475569',
      gridColor: '#cbd5e1',
    },
  },

  maxStoredItems: 6,
  maxStoredPlayers: 6,
};
