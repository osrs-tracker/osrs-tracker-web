const xmlFormatter = require('xml-formatter');
const { writeFile, stat } = require('fs').promises;

(async () => {
  const sitemapIndex = `
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://osrs-tracker.freekmencke.com/sitemap-site.xml</loc>
    <lastmod>${(await stat('src/sitemap-site.xml')).mtime.toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://osrs-tracker.freekmencke.com/sitemap-items.xml</loc>
    <lastmod>${(await stat('src/sitemap-items.xml')).mtime.toISOString()}</lastmod>
  </sitemap>
</sitemapindex>`;

  const xml = xmlFormatter(sitemapIndex, {
    indentation: '  ',
    collapseContent: true,
    lineSeparator: '\n',
  });

  await writeFile('src/sitemap.xml', xml, 'utf8');
})();
