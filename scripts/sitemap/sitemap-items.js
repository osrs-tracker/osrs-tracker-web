import { fetchList, SITE_URL, urlset, writeSitemap } from './sitemap-file.js';

const OUTPUT = 'public/sitemap-items.xml';

// Every item the Wiki knows, as the API's item refresh reads the same list. No <lastmod>: prices change all the time and
// the item data rarely, so there's no honest date.
(async () => {
  const items = await fetchList('https://prices.runescape.wiki/api/v1/osrs/mapping');
  if (!items) {
    console.warn(`Keeping ${OUTPUT}.`);
    return;
  }

  const urls = items
    .map(({ id }) => id)
    .sort((a, b) => a - b)
    .map(id => ({ loc: `${SITE_URL}/trackers/price/${id}` }));

  await writeSitemap(OUTPUT, urlset(urls));
})();
