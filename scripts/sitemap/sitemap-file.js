import xmlFormatter from 'xml-formatter';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

export const SITE_URL = 'https://osrs-tracker.freekmencke.com';

const FETCH_TIMEOUT_MS = 30_000;

export const git = args => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/** Dates come from the git history, which a shallow clone lacks and the Docker build has no git or .git for. */
export const hasFullHistory = () => {
  try {
    return git(['rev-parse', '--is-shallow-repository']) === 'false';
  } catch {
    return false;
  }
};

export const escapeXml = text =>
  text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);

/** A `<urlset>` of `<url>` entries, each `{ loc, lastmod? }`. No `<priority>` or `<changefreq>`: Google ignores both. */
export const urlset = urls =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(({ loc, lastmod }) =>
      ['<url>', `<loc>${escapeXml(loc)}</loc>`, lastmod ? `<lastmod>${lastmod}</lastmod>` : '', '</url>'].join(''),
    ),
    '</urlset>',
  ].join('');

/**
 * A JSON list from a source the build doesn't control (the Wiki, the API), or `undefined` with a warning when it fails or
 * comes back empty. The caller then keeps the committed file: a deploy shouldn't fail, or lose a sitemap, on a hiccup.
 */
export const fetchList = async url => {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'osrs-tracker-web sitemap' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const list = await response.json();
    if (!Array.isArray(list) || list.length === 0) throw new Error('not a list, or an empty one');
    return list;
  } catch (error) {
    console.warn(`Couldn't fetch ${url} (${error.message}).`);
    return undefined;
  }
};

/** Formats and writes a sitemap, leaving the file alone when its content is unchanged. */
export const writeSitemap = async (path, xml) => {
  const formatted = xmlFormatter(xml, { indentation: '  ', collapseContent: true, lineSeparator: '\n' });

  const current = await readFile(path, 'utf8').catch(() => undefined);
  if (formatted === current) {
    console.log(`${path} is unchanged, skipping write.`);
    return;
  }

  await writeFile(path, formatted, 'utf8');
};
