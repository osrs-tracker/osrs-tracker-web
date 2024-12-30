const xmlFormatter = require('xml-formatter');
const { readFile, writeFile, stat } = require('fs').promises;

(async () => {
  const sitemapIndex = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://osrs-tracker.freekmencke.com/</loc>
    <priority>1.0</priority>
    <changefreq>weekly</changefreq>
  </url>
  <url>
    <loc>https://osrs-tracker.freekmencke.com/trackers/price</loc>
    <priority>1.0</priority>
    <changefreq>weekly</changefreq>
  </url>
  <url>
    <loc>https://osrs-tracker.freekmencke.com/trackers/xp</loc>
    <priority>1.0</priority>
    <changefreq>weekly</changefreq>
  </url>
  <url>
    <loc>https://osrs-tracker.freekmencke.com/about/changelog</loc>
    <priority>0.7</priority>
    <lastmod>${(await stat('CHANGELOG.md')).mtime.toISOString()}</lastmod>
  </url>
  <url>
    <loc>https://osrs-tracker.freekmencke.com/about/privacy</loc>
    <priority>0.3</priority>
    <lastmod>${(await stat('src/app/features/about/privacy')).mtime.toISOString()}</lastmod>
  </url>
  <url>
    <loc>https://osrs-tracker.freekmencke.com/about/terms</loc>
    <priority>0.3</priority>
    <lastmod>${(await stat('src/app/features/about/terms')).mtime.toISOString()}</lastmod>
  </url>
</urlset>`;

  const xml = xmlFormatter(sitemapIndex, {
    indentation: '  ',
    collapseContent: true,
    lineSeparator: '\n',
  });

  if (xml === (await readFile('src/sitemap-site.xml', 'utf8'))) {
    console.log('File content is identical, skipping write.');
    return;
  }

  await writeFile('src/sitemap-site.xml', xml, 'utf8');
})();
