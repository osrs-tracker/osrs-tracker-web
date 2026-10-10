import { readFile } from 'node:fs/promises';
import { git, hasFullHistory, SITE_URL, writeSitemap } from './sitemap-file.js';

const OUTPUT = 'public/sitemap.xml';
// The site sitemap is a file in public/; the items and players ones are built by the server from the API
// (src/server/routers/sitemaps.ts), so they change without a deploy and have no build-time date.
const DATED = ['sitemap-site.xml'];
const UNDATED = ['sitemap-items.xml', 'sitemap-players.xml'];

const day = date => date.toISOString().slice(0, 10);

// The day a sitemap's content last changed: today when this run changed it (it differs from the committed copy), else
// the day of the last commit that changed it. Not the file's timestamp, which in the CD workflow is the checkout time.
// A day, not a time: the CD workflow commits a few minutes after generating, and a time would then change once more on
// the next deploy without the content changing. UTC, as the deploy commits are.
const lastmod = async file => {
  const path = `public/${file}`;
  let committed;
  try {
    committed = git(['show', `HEAD:${path}`]);
  } catch {
    // Not committed yet
  }
  if (committed !== (await readFile(path, 'utf8')).trim()) return day(new Date());

  return day(new Date(Number(git(['log', '-1', '--format=%ct', '--', path])) * 1000));
};

(async () => {
  // The committed file (or the one the CD workflow just generated, which the image is built from) is right already
  if (!hasFullHistory()) {
    console.log(`No full git history, keeping ${OUTPUT}.`);
    return;
  }

  const sitemaps = [
    ...(await Promise.all(
      DATED.map(
        async file => `<sitemap><loc>${SITE_URL}/${file}</loc><lastmod>${await lastmod(file)}</lastmod></sitemap>`,
      ),
    )),
    ...UNDATED.map(file => `<sitemap><loc>${SITE_URL}/${file}</loc></sitemap>`),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemaps,
    '</sitemapindex>',
  ].join('');

  await writeSitemap(OUTPUT, xml);
})();
