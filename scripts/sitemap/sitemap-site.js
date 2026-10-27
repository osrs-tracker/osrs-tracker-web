import { git, hasFullHistory, SITE_URL, urlset, writeSitemap } from './sitemap-file.js';

const OUTPUT = 'public/sitemap-site.xml';

// For a page in the app, its template holds the text. File timestamps won't do: a fresh checkout (the CD workflow) gives every file the checkout time, so every deploy would
// move the dates without the pages changing. A rename doesn't count, and older commits are followed across it. A file
// with no commits yet gets no <lastmod> rather than a made-up date.
const lastmod = file => git(['log', '-1', '--follow', '--diff-filter=AMT', '--format=%cI', '--', file]) || undefined;

(async () => {
  // The committed file (or the one the CD workflow just generated, which the image is built from) is right already
  if (!hasFullHistory()) {
    console.log(`No full git history, keeping ${OUTPUT}.`);
    return;
  }

  // The landings, the price tables and new items, the players online page and the news archive have no lastmod: they show live data
  // (recent lookups, prices, news, the player count), so they change all the time. Nor do the browse pages, one per first letter (as BROWSE_LETTERS in the app):
  // their item lists come from the API and change without a commit, so their template's date would tell search engines
  // a page is unchanged when it isn't.
  const urls = [
    { loc: `${SITE_URL}/` },
    { loc: `${SITE_URL}/trackers/price` },
    { loc: `${SITE_URL}/trackers/price/high-alch` },
    { loc: `${SITE_URL}/trackers/price/margins` },
    { loc: `${SITE_URL}/trackers/price/new` },
    ...[...'abcdefghijklmnopqrstuvwxyz', '0'].map(letter => ({ loc: `${SITE_URL}/trackers/price/browse/${letter}` })),
    { loc: `${SITE_URL}/trackers/xp` },
    { loc: `${SITE_URL}/players-online` },
    { loc: `${SITE_URL}/news` },
    { loc: `${SITE_URL}/about/changelog`, lastmod: lastmod('CHANGELOG.md') },
    { loc: `${SITE_URL}/about/how-it-works`, lastmod: lastmod('src/app/features/about/how-it-works/how-it-works.ts') },
    { loc: `${SITE_URL}/about/privacy`, lastmod: lastmod('src/app/features/about/privacy/privacy.html') },
    { loc: `${SITE_URL}/about/terms`, lastmod: lastmod('src/app/features/about/terms/terms.html') },
  ];

  await writeSitemap(OUTPUT, urlset(urls));
})();
