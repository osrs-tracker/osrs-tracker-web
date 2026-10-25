import { config } from '@config/config';
import type { Logger } from '@osrs-tracker/logger';
import express from 'express';
import { serverConfig } from '../server-config';
import type { WebLogType } from '../utils/log';

/** A JSON response from the API, at a path such as `/items?letter=a` */
export type GetJson = (path: string) => Promise<unknown>;

interface SitemapUrl {
  loc: string;
  lastmod?: string;
}

/** Every letter of the API's item browse (as `BROWSE_LETTERS` in the app): together, every item */
const BROWSE_LETTERS = [...'abcdefghijklmnopqrstuvwxyz', '0'];

const FETCH_TIMEOUT_MS = 10_000;
// After a failed load, how long a sitemap keeps its last good copy (or 503) before it tries again
const RETRY_AFTER_MS = 60_000;

const escapeXml = (text: string) =>
  text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);

/** A `<urlset>`, one `<url>` per line. No `<priority>` or `<changefreq>`: Google ignores both. */
function urlset(urls: SitemapUrl[]): string {
  const lines = urls.map(
    ({ loc, lastmod }) => `<url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...lines,
    '</urlset>',
  ].join('\n');
}

/**
 * The item pages, by id: every item the API has, so every page in it resolves. Dated by the item's `updatedAt`, when the
 * API last stored a change to it (its add included); items it stored before it kept that date have none, and no
 * `<lastmod>`.
 */
async function itemsSitemap(getJson: GetJson): Promise<string> {
  const letters = await Promise.all(
    BROWSE_LETTERS.map(letter => getJson(`/items?letter=${letter}`) as Promise<{ id: number; updatedAt?: string }[]>),
  );
  // An item in two letters' lists is the same document, so either row's date will do
  const items = new Map(letters.flat().map(({ id, updatedAt }) => [id, updatedAt]));
  if (items.size === 0) throw new Error('The API has no items');

  return urlset(
    [...items]
      .sort(([a], [b]) => a - b)
      .map(([id, updatedAt]) => ({ loc: `${config.siteUrl}/trackers/price/${id}`, lastmod: updatedAt })),
  );
}

/**
 * The tracked players with a recent hiscore entry (the API decides which), at the page's canonical, the API's
 * lower-case name (`player-detail-meta.ts`), dated by the newest entry: when the page last changed.
 */
async function playersSitemap(getJson: GetJson): Promise<string> {
  const players = (await getJson('/sitemap/players')) as { username: string; lastEntry: string }[];
  if (players.length === 0) throw new Error('The API has no players for the sitemap');

  return urlset(
    players.map(({ username, lastEntry }) => ({
      loc: `${config.siteUrl}/trackers/xp/${encodeURIComponent(username)}`,
      lastmod: lastEntry,
    })),
  );
}

/**
 * A sitemap built on demand and kept for `ttl` ms. Requests while it loads share the load. A failed load keeps the last
 * good copy (`undefined` before the first) and tries again after `RETRY_AFTER_MS`, so a down API isn't asked again on
 * every request.
 */
export function cachedSitemap(build: () => Promise<string>, ttl: number, onError: (error: unknown) => void) {
  let xml: string | undefined;
  let expiresAt = 0;
  let loading: Promise<string | undefined> | undefined;

  return (): Promise<string | undefined> => {
    if (Date.now() < expiresAt) return Promise.resolve(xml);

    loading ??= build()
      .then(
        built => {
          xml = built;
          expiresAt = Date.now() + ttl;
          return xml;
        },
        (error: unknown) => {
          onError(error);
          expiresAt = Date.now() + RETRY_AFTER_MS;
          return xml;
        },
      )
      .finally(() => (loading = undefined));
    return loading;
  };
}

/** The API's JSON, in the cluster through `API_INTERNAL_URL` like SSR, else the public URL */
const fetchApiJson: GetJson = async path => {
  const response = await fetch(`${serverConfig.API_INTERNAL_URL ?? config.apiBaseUrl}${path}`, {
    headers: { 'User-Agent': config.userAgent },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`GET ${path} answered ${response.status}`);
  return response.json();
};

/**
 * `/sitemap-items.xml` and `/sitemap-players.xml`, built from the API when requested rather than at build time: players
 * get a new hiscore entry every day and the API new items, neither with a deploy. Cached as long as the API caches the
 * lists (a day for items, an hour for players). 503 when the API failed and there's no earlier copy.
 */
export function createSitemapRouter({ logger, getJson = fetchApiJson }: { logger: Logger; getJson?: GetJson }) {
  const log = logger.child({ type: 'sitemap' satisfies WebLogType });
  const sitemaps = {
    '/sitemap-items.xml': cachedSitemap(
      () => itemsSitemap(getJson),
      86_400_000,
      error => log.warn({ error }, 'Building the items sitemap failed'),
    ),
    '/sitemap-players.xml': cachedSitemap(
      () => playersSitemap(getJson),
      3_600_000,
      error => log.warn({ error }, 'Building the players sitemap failed'),
    ),
  };

  const router = express.Router();
  for (const [path, sitemap] of Object.entries(sitemaps)) {
    router.get(path, async (_req, res) => {
      const xml = await sitemap();
      if (!xml) {
        res
          .status(503)
          .set('Retry-After', String(RETRY_AFTER_MS / 1000))
          .send('Sitemap unavailable');
        return;
      }
      res.set('Cache-Control', 'public, max-age=3600').type('application/xml').send(xml);
    });
  }
  return router;
}
