import { SITE_URL, writeSitemap } from './sitemap-file.js';

const SITEMAPS = ['sitemap-site.xml', 'sitemap-items.xml', 'sitemap-players.xml'];

// No <lastmod> (it's optional): the dated pages carry their own dates in sitemap-site.xml and sitemap-players.xml, and
// sitemap-items.xml has no source with a date (it lists the Wiki's items). A file timestamp is the checkout time in the
// CD workflow, wrong on every deploy.
(async () => {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...SITEMAPS.map(file => `<sitemap><loc>${SITE_URL}/${file}</loc></sitemap>`),
    '</sitemapindex>',
  ].join('');

  await writeSitemap('public/sitemap.xml', xml);
})();
