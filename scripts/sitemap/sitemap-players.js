import { fetchList, SITE_URL, urlset, writeSitemap } from './sitemap-file.js';

const OUTPUT = 'public/sitemap-players.xml';

// The tracked players with a recent hiscore entry (the API decides which, GET /sitemap/players). The <loc> is the page's
// canonical, the API's lower-case name (player-detail-meta.ts), and <lastmod> the newest entry: when the page changed.
(async () => {
  const players = await fetchList('https://osrs-tracker-api.freekmencke.com/sitemap/players');
  if (!players) {
    console.warn(`Keeping ${OUTPUT}.`);
    return;
  }

  const urls = players.map(({ username, lastEntry }) => ({
    loc: `${SITE_URL}/trackers/xp/${encodeURIComponent(username)}`,
    lastmod: lastEntry,
  }));

  await writeSitemap(OUTPUT, urlset(urls));
})();
