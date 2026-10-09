const xmlFormatter = require('xml-formatter');
const { writeFile } = require('fs').promises;

// No <lastmod> (it's optional): the pages' own dates are in sitemap-site.xml, and sitemap-items.xml has no source with a
// date (it lists the Wiki's items). A file timestamp is the checkout time in the CD workflow, wrong on every deploy.
(async () => {
  const sitemapIndex = `
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://osrs-tracker.freekmencke.com/sitemap-site.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://osrs-tracker.freekmencke.com/sitemap-items.xml</loc>
  </sitemap>
</sitemapindex>`;

  const xml = xmlFormatter(sitemapIndex, {
    indentation: '  ',
    collapseContent: true,
    lineSeparator: '\n',
  });

  await writeFile('src/sitemap.xml', xml, 'utf8');
})();
