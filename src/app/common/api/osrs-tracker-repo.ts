import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import {
  HiscoreEntry,
  Item,
  NewsArchivePage,
  OsrsNewsItem,
  Player,
  PlayerCount,
  PlayerCountPoint,
  PlayerCountRange,
} from '@osrs-tracker/models';
import { Observable, map } from 'rxjs';
import { LOADING_INDICATOR } from '@app/core/interceptors/loading-indicator-interceptor';
import { SSR_TIMEOUT } from '@app/core/interceptors/ssr-timeout-interceptor';
import { config } from '@config/config';

/** A news post's image (a `cdn.runescape.com` URL) through the API, as WebP */
export function newsImageUrl(url: string): string {
  return `${config.apiBaseUrl}/news/image?url=${encodeURIComponent(url)}`;
}

/** A player in the top gainers: `gain` is the Overall XP between their two newest offset-0 entries, `date` the newer one's */
export interface TopGainer {
  username: string;
  gain: number;
  date: Date;
}

/** Only these fields, and always dated */
export type NewItem = Pick<Item, 'id' | 'name' | 'icon'> & Required<Pick<Item, 'addedAt'>>;

@Service()
export class OsrsTrackerRepo {
  private readonly httpClient = inject(HttpClient);

  getPlayerInfo(
    username: string,
    scrapingOffset: number,
    options?: { includeLatestHiscoreEntry?: boolean; loadingIndicator?: boolean; preview?: boolean },
  ): Observable<Player> {
    return this.httpClient
      .get<Player>(`/players/${encodeURIComponent(username)}`, {
        context: new HttpContext().set(LOADING_INDICATOR, options?.loadingIndicator),
        params: {
          scrapingOffset,
          ...(options?.includeLatestHiscoreEntry ? { includeLatestHiscoreEntry: true } : {}),
          ...(options?.preview === false ? { preview: false } : {}),
        },
      })
      .pipe(map(player => this.#parsePlayer(player)));
  }

  /**
   * Records the lookup and starts tracking the player for `scrapingOffset`, or refreshes them when stale. `null` when
   * the API took us for a bot. Only call it for `isHumanVisitor()`.
   */
  trackPlayer(username: string, scrapingOffset: number): Observable<Player | null> {
    return this.httpClient
      .post<Player | null>(`/players/${encodeURIComponent(username)}/lookup`, null, { params: { scrapingOffset } })
      .pipe(map(player => (player ? this.#parsePlayer(player) : null)));
  }

  getPlayerHiscores(username: string, scrapingOffset: number, limit: number, skip: number): Observable<HiscoreEntry[]> {
    return this.httpClient // Returns `null` when no hiscores have been scraped yet.
      .get<HiscoreEntry[] | null>(`/players/${encodeURIComponent(username)}/hiscores`, {
        params: { scrapingOffset, limit, skip },
      })
      .pipe(map(hiscoreEntries => (hiscoreEntries ?? []).map(entry => ({ ...entry, date: new Date(entry.date) }))));
  }

  /**
   * Each player's `hiscoreEntries` holds only their newest entry for `scrapingOffset`, or none, with only its date and
   * Overall (`entry=overall`): the rows need no more, and the list is embedded in the page's transfer state
   */
  getRecentPlayerLookups(scrapingOffset: number): Observable<Player[]> {
    return this.httpClient
      .get<Player[]>('/players', { params: { limit: config.maxStoredPlayers, scrapingOffset, entry: 'overall' } })
      .pipe(map(players => players.map(player => this.#parsePlayer(player))));
  }

  /** Over the newest day the 00:00 UTC scrape covers, largest first; at most 50 */
  getTopGainers(limit: number): Observable<TopGainer[]> {
    return this.httpClient
      .get<TopGainer[]>('/players', { params: { sort: 'gain', limit } })
      .pipe(map(gainers => gainers.map(gainer => ({ ...gainer, date: new Date(gainer.date) }))));
  }

  #parsePlayer(player: Player): Player {
    return {
      ...player,
      hiscoreEntries: player.hiscoreEntries?.map(entry => ({ ...entry, date: new Date(entry.date) })),
    };
  }

  searchItems(query: string): Observable<Item[] | void> {
    return this.httpClient.get<Item[]>('/items', { params: { search: query } });
  }

  /**
   * `letter` is `a`–`z`, or `0` for any other first character. A 400 for any other letter.
   */
  getItemsByLetter(letter: string): Observable<Pick<Item, 'id' | 'name' | 'icon'>[]> {
    return this.httpClient.get<Pick<Item, 'id' | 'name' | 'icon'>[]>('/items', {
      params: { letter },
      context: new HttpContext().set(LOADING_INDICATOR, true),
    });
  }

  /** Only items added since the API began dating them (25 October 2026); `limit` is 1–100 */
  getNewItems(limit: number): Observable<NewItem[]> {
    return this.httpClient
      .get<NewItem[]>('/items', { params: { sort: 'added', limit } })
      .pipe(map(items => items.map(item => ({ ...item, addedAt: new Date(item.addedAt) }))));
  }

  getItemInfo(itemId: number, options?: { loadingIndicator: boolean }): Observable<Item> {
    return this.httpClient.get<Item>(`/items/${itemId}`, {
      context: new HttpContext().set(LOADING_INDICATOR, options?.loadingIndicator),
    });
  }

  /** Adds the item to the recent lookups. Only call it for `isHumanVisitor()`. */
  recordItemLookup(itemId: number): Observable<void> {
    return this.httpClient.post<void>(`/items/${itemId}/lookup`, null);
  }

  getRecentItemLookups(): Observable<Item[]> {
    return this.httpClient.get<Item[]>('/items', { params: { limit: config.maxStoredItems } });
  }

  // Requests refreshed every minute revalidate with the API (a 304 when unchanged) instead of using the browser cache's
  // copy (`max-age=60` live, 300 history). Not the ones SSR renders (`/latest`, the first `/live`): the transfer cache
  // leaves out a request with `cache: 'no-cache'`, so the browser would fetch it again on hydration

  /** Sampled every 10 minutes */
  getLatestPlayerCount(): Observable<PlayerCount> {
    return this.httpClient
      .get<PlayerCount>('/player-counts/latest')
      .pipe(map(playerCount => ({ ...playerCount, date: new Date(playerCount.date) })));
  }

  /**
   * From Jagex's world list, which the API keeps for up to a minute; `refresh` revalidates. Fails after the SSR timeout
   * during a render, as the API may be waiting on Jagex.
   */
  getLivePlayerCount(refresh: boolean): Observable<PlayerCount> {
    return this.httpClient
      .get<PlayerCount>('/player-counts/live', {
        context: new HttpContext().set(SSR_TIMEOUT, true),
        cache: refresh ? 'no-cache' : 'default',
      })
      .pipe(map(playerCount => ({ ...playerCount, date: new Date(playerCount.date) })));
  }

  /** Oldest first: 10-minute samples (24h, 7d), hourly (30d), daily (1y, all) */
  getPlayerCountHistory(range: PlayerCountRange): Observable<PlayerCountPoint[]> {
    return this.httpClient
      .get<PlayerCountPoint[]>('/player-counts', { params: { range }, cache: 'no-cache' })
      .pipe(map(points => points.map(point => ({ ...point, date: new Date(point.date) }))));
  }

  getNews(): Observable<OsrsNewsItem[]> {
    return this.httpClient
      .get<OsrsNewsItem[]>('/news')
      .pipe(map(items => items.map(item => ({ ...item, pubDate: new Date(item.pubDate) }))));
  }

  /**
   * `limit` is at most 50; the older pages come with the previous page's `next` as `before`. `category` is a name as
   * Jagex uses it (`Event`, not `Events`).
   */
  getNewsArchive(limit: number, options?: { before?: string; category?: string }): Observable<NewsArchivePage> {
    return this.httpClient
      .get<NewsArchivePage>('/news/archive', {
        params: {
          limit,
          ...(options?.before ? { before: options.before } : {}),
          ...(options?.category ? { category: options.category } : {}),
        },
      })
      .pipe(map(page => ({ ...page, posts: page.posts.map(post => ({ ...post, pubDate: new Date(post.pubDate) })) })));
  }
}
