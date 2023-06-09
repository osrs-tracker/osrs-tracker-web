const { writeFile } = require('fs').promises;

(async () => {
  const sitemapIndex = `
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
   <sitemap>
      <loc>https://osrs-tracker.freekmencke.com/sitemap-site.xml</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
   </sitemap>
   <sitemap>
      <loc>https://osrs-tracker.freekmencke.com/sitemap-items.xml</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
   </sitemap>
</sitemapindex>`;

  await writeFile('src/sitemap.xml', sitemapIndex.trim(), 'utf8');
})();
