import { config } from '@config/config';
import type { Logger } from '@osrs-tracker/logger';
import type { Item } from '@osrs-tracker/models';
import express from 'express';
import { allowCrossOriginEmbedding } from '../middleware/security';
import { serverConfig } from '../server-config';
import type { WebLogType } from '../utils/log';

/** The item from the API, or `undefined` when it has no such id. Throws on any other failure. */
export type GetItem = (id: number) => Promise<Item | undefined>;
/** The item's Wiki icon as PNG bytes. Throws when it failed to load. */
export type GetIcon = (item: Item) => Promise<Uint8Array>;
export type RenderItemCard = (item: Item, iconPng: Uint8Array | undefined) => Promise<Uint8Array>;

const API_TIMEOUT_MS = 5000;
const MAX_CACHED = 200;
const SHORT_CACHE = 'public, max-age=300';
const LONG_CACHE = 'public, max-age=604800, immutable';

/** The API's item, in the cluster through `API_INTERNAL_URL` like SSR, else the public URL */
const fetchItem: GetItem = async id => {
  const response = await fetch(`${serverConfig.API_INTERNAL_URL ?? config.apiBaseUrl}/items/${id}`, {
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`GET /items/${id} answered ${response.status}`);
  return (await response.json()) as Item;
};

/** The Wiki's icon, with the user agent SSR sends it */
const fetchIcon: GetIcon = async item => {
  const response = await fetch(`${config.wikiBaseUrl}/images/${item.icon.replaceAll(/\s/g, '_')}`, {
    headers: { 'User-Agent': 'OSRS Tracker SSR - https://osrs-tracker.freekmencke.com' },
    signal: AbortSignal.timeout(serverConfig.ssrRequestTimeout),
  });
  if (!response.ok) throw new Error(`Icon answered ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
};

/** Loads the renderer on first use, so its large chunk isn't read at startup */
const renderLazily: RenderItemCard = async (item, iconPng) =>
  (await import('../og/item-card')).renderItemCard(item, iconPng);

type Card = { kind: 'ok' | 'no-icon'; png: Uint8Array } | { kind: 'not-found' };

/**
 * `GET /og/item/:id.png`: the item page's link preview image, drawn by `renderItemCard`. Finished images are kept in
 * memory (the 200 most recently used) and requests for the same id share one load and render. An unknown item or an
 * API failure answers a short-lived 404; an icon that failed to load gives a card without it that isn't kept.
 */
export function createOgImageRouter({
  logger,
  getItem = fetchItem,
  getIcon = fetchIcon,
  render = renderLazily,
}: {
  logger: Logger;
  getItem?: GetItem;
  getIcon?: GetIcon;
  render?: RenderItemCard;
}) {
  const log = logger.child({ type: 'og-image' satisfies WebLogType });
  const cache = new Map<number, Uint8Array>();
  const loading = new Map<number, Promise<Card>>();

  async function load(id: number): Promise<Card> {
    let item: Item | undefined;
    try {
      item = await getItem(id);
    } catch (error) {
      log.warn({ error, id }, 'Loading the item for its image failed');
      return { kind: 'not-found' };
    }
    if (!item) return { kind: 'not-found' };

    let icon: Uint8Array | undefined;
    try {
      icon = await getIcon(item);
    } catch (error) {
      log.warn({ error, id }, 'Loading the item icon failed, drawing the card without it');
    }
    const png = await render(item, icon); // A throw rejects: Express' error handler answers 500
    if (!icon) return { kind: 'no-icon', png };

    cache.set(id, png);
    if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!);
    return { kind: 'ok', png };
  }

  const router = express.Router();
  router.get(/^\/og\/item\/(\d+)\.png$/, async (req, res) => {
    const id = Number(req.params[0]);

    let card: Card;
    const cached = cache.get(id);
    if (cached) {
      cache.delete(id);
      cache.set(id, cached); // Most recently used last
      card = { kind: 'ok', png: cached };
    } else {
      let pending = loading.get(id);
      if (!pending) {
        pending = load(id).finally(() => loading.delete(id));
        loading.set(id, pending);
      }
      card = await pending;
    }

    if (card.kind === 'not-found') {
      res.status(404).set('Cache-Control', SHORT_CACHE).type('text/plain').send('Not found');
      return;
    }
    allowCrossOriginEmbedding(res);
    res
      .set('Cache-Control', card.kind === 'ok' ? LONG_CACHE : SHORT_CACHE)
      .type('image/png')
      .send(Buffer.from(card.png));
  });
  return router;
}
