import { config } from '@config/config';
import type { Logger } from '@osrs-tracker/logger';
import type { Item, Player, PlayerCountPoint } from '@osrs-tracker/models';
import express from 'express';
import { allowCrossOriginEmbedding } from '../middleware/security';
import { serverConfig } from '../server-config';
import type { WebLogType } from '../utils/log';

/** The item from the API, or `undefined` when it has no such id. Throws on any other failure. */
export type GetItem = (id: number) => Promise<Item | undefined>;
/** The item's Wiki icon as PNG bytes. Throws when it failed to load. */
export type GetIcon = (item: Item) => Promise<Uint8Array>;
export type RenderItemCard = (item: Item, iconPng: Uint8Array | undefined) => Promise<Uint8Array>;
/** The stored player with their latest hiscores, or `undefined` when the API doesn't store them. Throws otherwise. */
export type GetPlayer = (username: string) => Promise<Player | undefined>;
export type RenderPlayerCard = (player: Player) => Promise<Uint8Array>;
/** The players online over the last 24 hours, oldest first. Throws when it failed to load. */
export type GetPlayerCounts = () => Promise<PlayerCountPoint[]>;
export type RenderPlayersOnlineCard = (samples: PlayerCountPoint[]) => Promise<Uint8Array>;

const API_TIMEOUT_MS = 5000;
const MAX_CACHED = 200;
const SHORT_CACHE = 'public, max-age=300';
const LONG_CACHE = 'public, max-age=604800, immutable';
// Stats change daily: an hour old at most, in memory and in caches that listen
const PLAYER_CACHE_SECONDS = 3600;
// A new count every 10 minutes
const PLAYERS_ONLINE_CACHE_SECONDS = 600;
// Jagex's names, once `_` and `-` are spaces: 1 to 12 letters, digits and spaces
const USERNAME = /^[a-z0-9 ]{1,12}$/;

const apiBaseUrl = () => serverConfig.API_INTERNAL_URL ?? config.apiBaseUrl;

/** The API's item, in the cluster through `API_INTERNAL_URL` like SSR, else the public URL */
const fetchItem: GetItem = async id => {
  const response = await fetch(`${apiBaseUrl()}/items/${id}`, {
    headers: { 'User-Agent': config.userAgent },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`GET /items/${id} answered ${response.status}`);
  return (await response.json()) as Item;
};

/** The Wiki's icon */
const fetchIcon: GetIcon = async item => {
  const response = await fetch(`${config.wikiBaseUrl}/images/${item.icon.replaceAll(/\s/g, '_')}`, {
    headers: { 'User-Agent': config.userAgent },
    signal: AbortSignal.timeout(serverConfig.ssrRequestTimeout),
  });
  if (!response.ok) throw new Error(`Icon answered ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
};

/**
 * The stored player with their newest hiscores at the default offset. `skipRefresh` keeps it read-only: a player the API
 * doesn't store answers 404 instead of a live preview, so an image URL never makes the API call the hiscores.
 */
const fetchPlayer: GetPlayer = async username => {
  const params = new URLSearchParams({ scrapingOffset: '0', includeLatestHiscoreEntry: 'true', skipRefresh: 'true' });
  const response = await fetch(`${apiBaseUrl()}/players/${encodeURIComponent(username)}?${params}`, {
    headers: { 'User-Agent': config.userAgent },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`GET /players/${username} answered ${response.status}`);
  return (await response.json()) as Player;
};

/** The last 24 hours of player counts */
const fetchPlayerCounts: GetPlayerCounts = async () => {
  const response = await fetch(`${apiBaseUrl()}/player-counts?range=24h`, {
    headers: { 'User-Agent': config.userAgent },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`GET /player-counts answered ${response.status}`);
  const points = (await response.json()) as PlayerCountPoint[];
  return points.map(point => ({ ...point, date: new Date(point.date) }));
};

/** Loads the renderers on first use, so their large chunk isn't read at startup */
const renderItemLazily: RenderItemCard = async (item, iconPng) =>
  (await import('../og/item-card')).renderItemCard(item, iconPng);
const renderPlayerLazily: RenderPlayerCard = async player =>
  (await import('../og/player-card')).renderPlayerCard(player, player.hiscoreEntries?.[0]);
const renderPlayersOnlineLazily: RenderPlayersOnlineCard = async samples =>
  (await import('../og/players-online-card')).renderPlayersOnlineCard(samples);

/** `keep: false` serves the image without caching it (an item card drawn without its icon) */
type Card = { kind: 'image'; png: Uint8Array; keep: boolean } | { kind: 'not-found' };

/**
 * The finished images (the most recently used `MAX_CACHED`, each for `maxAgeMs` if given), and the loads in progress,
 * so requests for the same key share one load and render
 */
function cardCache<K>(load: (key: K) => Promise<Card>, maxAgeMs?: number) {
  const cache = new Map<K, { png: Uint8Array; at: number }>();
  const loading = new Map<K, Promise<Card>>();

  async function loadAndKeep(key: K): Promise<Card> {
    const card = await load(key);
    if (card.kind === 'image' && card.keep) {
      cache.set(key, { png: card.png, at: Date.now() });
      if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!);
    }
    return card;
  }

  return async (key: K): Promise<Card> => {
    const cached = cache.get(key);
    cache.delete(key);
    if (cached && (maxAgeMs === undefined || Date.now() - cached.at < maxAgeMs)) {
      cache.set(key, cached); // Most recently used last
      return { kind: 'image', png: cached.png, keep: true };
    }
    let pending = loading.get(key);
    if (!pending) {
      pending = loadAndKeep(key).finally(() => loading.delete(key));
      loading.set(key, pending);
    }
    return pending;
  };
}

/**
 * The link preview images, drawn by `renderItemCard` and `renderPlayerCard`:
 * - `GET /og/item/:id.png`, kept a week. An icon that failed to load gives a card without it that isn't kept.
 * - `GET /og/player/:username.png`, a stored player, kept an hour as their stats change daily.
 * - `GET /og/players-online.png`, the players online page's, kept 10 minutes as the count changes that often; its footer
 *   dates the count, as chat apps keep a preview for weeks.
 *
 * An unknown item or player, or an API failure (or fewer than two counts to draw a line through), answers a
 * short-lived 404.
 */
export function createOgImageRouter({
  logger,
  getItem = fetchItem,
  getIcon = fetchIcon,
  render = renderItemLazily,
  getPlayer = fetchPlayer,
  renderPlayer = renderPlayerLazily,
  getPlayerCounts = fetchPlayerCounts,
  renderPlayersOnline = renderPlayersOnlineLazily,
}: {
  logger: Logger;
  getItem?: GetItem;
  getIcon?: GetIcon;
  render?: RenderItemCard;
  getPlayer?: GetPlayer;
  renderPlayer?: RenderPlayerCard;
  getPlayerCounts?: GetPlayerCounts;
  renderPlayersOnline?: RenderPlayersOnlineCard;
}) {
  const log = logger.child({ type: 'og-image' satisfies WebLogType });

  const itemCard = cardCache<number>(async id => {
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
    return { kind: 'image', png, keep: !!icon };
  });

  const playerCard = cardCache<string>(async username => {
    let player: Player | undefined;
    try {
      player = await getPlayer(username);
    } catch (error) {
      log.warn({ error, username }, 'Loading the player for their image failed');
      return { kind: 'not-found' };
    }
    if (!player) return { kind: 'not-found' };
    return { kind: 'image', png: await renderPlayer(player), keep: true };
  }, PLAYER_CACHE_SECONDS * 1000);

  // One image, so one key
  const playersOnlineCard = cardCache<'players-online'>(async () => {
    let samples: PlayerCountPoint[];
    try {
      samples = await getPlayerCounts();
    } catch (error) {
      log.warn({ error }, 'Loading the player counts for their image failed');
      return { kind: 'not-found' };
    }
    if (samples.length < 2) return { kind: 'not-found' };
    return { kind: 'image', png: await renderPlayersOnline(samples), keep: true };
  }, PLAYERS_ONLINE_CACHE_SECONDS * 1000);

  function send(res: express.Response, card: Card, cacheControl: string) {
    if (card.kind === 'not-found') {
      res.status(404).set('Cache-Control', SHORT_CACHE).type('text/plain').send('Not found');
      return;
    }
    allowCrossOriginEmbedding(res);
    res
      .set('Cache-Control', card.keep ? cacheControl : SHORT_CACHE)
      .type('image/png')
      .send(Buffer.from(card.png));
  }

  const router = express.Router();
  router.get(/^\/og\/item\/(\d+)\.png$/, async (req, res) => {
    send(res, await itemCard(Number(req.params[0])), LONG_CACHE);
  });
  router.get(/^\/og\/player\/([^/]+)\.png$/, async (req, res) => {
    // One image per player however the name is spelled, as Jagex matches names
    const username = req.params[0].toLowerCase().replaceAll(/[_-]/g, ' ').trim();
    const card: Card = USERNAME.test(username) ? await playerCard(username) : { kind: 'not-found' };
    send(res, card, `public, max-age=${PLAYER_CACHE_SECONDS}`);
  });
  router.get('/og/players-online.png', async (_req, res) => {
    send(res, await playersOnlineCard('players-online'), `public, max-age=${PLAYERS_ONLINE_CACHE_SECONDS}`);
  });
  return router;
}
