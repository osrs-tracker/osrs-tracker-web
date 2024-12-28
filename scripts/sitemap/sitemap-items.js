const xmlFormatter = require('xml-formatter');
const { writeFile, readFile } = require('fs').promises;

const wrapXml = content => {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    content,
    '</urlset>',
  ].join('');
};

(async () => {
  const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/mapping');
  const items = await response.json();

  const entries = items
    .map(({ id }) => id)
    .sort((a, b) => a - b)
    .map(id => {
      return [
        '<url>',
        `<loc>https://osrs-tracker.freekmencke.com/trackers/price/${id}</loc>`,
        '<priority>0.5</priority>',
        '</url>',
      ].join('');
    });

  const xml = xmlFormatter(wrapXml(entries.join('')), {
    indentation: '  ',
    collapseContent: true,
    lineSeparator: '\n',
  });

  if (xml === (await readFile('src/sitemap-items.xml', 'utf8'))) {
    console.log('File content is identical, skipping write.');
    return;
  }

  await writeFile('src/sitemap-items.xml', xml, 'utf8');
})();
