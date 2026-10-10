import { execFileSync } from 'node:child_process';
import { SITE_URL, urlset, writeSitemap } from './sitemap-file.js';

const OUTPUT = 'public/sitemap-site.xml';

const git = args => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

// Dates come from the git history, which a shallow clone lacks and the Docker build has no git or .git for
const hasFullHistory = () => {
  try {
    return git(['rev-parse', '--is-shallow-repository']) === 'false';
  } catch {
    return false;
  }
};

// The date of the last commit that changed a page's file (for a page in the app, its template, which holds the text).
// File timestamps won't do: a fresh checkout (the CD workflow) gives every file the checkout time, so every deploy would
// move the dates without the pages changing. A rename doesn't count, and older commits are followed across it. A file
// with no commits yet gets no <lastmod> rather than a made-up date.
const lastmod = file => git(['log', '-1', '--follow', '--diff-filter=AMT', '--format=%cI', '--', file]) || undefined;

(async () => {
  // The committed file (or the one the CD workflow just generated, which the image is built from) is right already
  if (!hasFullHistory()) {
    console.log(`No full git history, keeping ${OUTPUT}.`);
    return;
  }

  // The landings have no lastmod: they show live data (recent lookups, news), so they change all the time
  const urls = [
    { loc: `${SITE_URL}/` },
    { loc: `${SITE_URL}/trackers/price` },
    // The browse pages, one per first letter (as BROWSE_LETTERS in the app); their text is the template
    ...[...'abcdefghijklmnopqrstuvwxyz', '0'].map(letter => ({
      loc: `${SITE_URL}/trackers/price/browse/${letter}`,
      lastmod: lastmod('src/app/features/trackers/price-tracker/browse/browse-items.html'),
    })),
    { loc: `${SITE_URL}/trackers/xp` },
    { loc: `${SITE_URL}/about/changelog`, lastmod: lastmod('CHANGELOG.md') },
    { loc: `${SITE_URL}/about/privacy`, lastmod: lastmod('src/app/features/about/privacy/privacy.html') },
    { loc: `${SITE_URL}/about/terms`, lastmod: lastmod('src/app/features/about/terms/terms.html') },
  ];

  await writeSitemap(OUTPUT, urlset(urls));
})();
