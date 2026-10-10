import xmlFormatter from 'xml-formatter';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const git = args => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

// Dates come from the git history, which a shallow clone lacks and the Docker build has no git or .git for
const hasFullHistory = () => {
  try {
    return git(['rev-parse', '--is-shallow-repository']) === 'false';
  } catch {
    return false;
  }
};

// The date of the last commit that changed a page's source. File timestamps won't do: a fresh checkout (the CD
// workflow) gives every file the checkout time, so every deploy would move the dates without the pages changing.
// A path with no commits yet gets no <lastmod> rather than a made-up date.
const lastmod = path => {
  const date = git(['log', '-1', '--format=%cI', '--', path]);
  return date ? `<lastmod>${date}</lastmod>` : '';
};

(async () => {
  // The committed file (or the one the CD workflow just generated, which the image is built from) is right already
  if (!hasFullHistory()) {
    console.log('No full git history, keeping public/sitemap-site.xml.');
    return;
  }

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
    ${lastmod('CHANGELOG.md')}
  </url>
  <url>
    <loc>https://osrs-tracker.freekmencke.com/about/privacy</loc>
    <priority>0.3</priority>
    ${lastmod('src/app/features/about/privacy')}
  </url>
  <url>
    <loc>https://osrs-tracker.freekmencke.com/about/terms</loc>
    <priority>0.3</priority>
    ${lastmod('src/app/features/about/terms')}
  </url>
</urlset>`;

  const xml = xmlFormatter(sitemapIndex, {
    indentation: '  ',
    collapseContent: true,
    lineSeparator: '\n',
  });

  if (xml === (await readFile('public/sitemap-site.xml', 'utf8'))) {
    console.log('File content is identical, skipping write.');
    return;
  }

  await writeFile('public/sitemap-site.xml', xml, 'utf8');
})();
