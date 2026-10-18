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

@Service()
export class OsrsTrackerRepo {
  private readonly httpClient = inject(HttpClient);

  //
  // Players
  //

  getPlayerInfo(
    username: string,
    scrapingOffset: number,
    options?: { includeLatestHiscoreEntry?: boolean; loadingIndicator?: boolean; skipRefresh?: boolean },
  ): Observable<Player> {
    return this.httpClient
      .get<Player>(`/players/${encodeURIComponent(username)}`, {
        context: new HttpContext().set(LOADING_INDICATOR, options?.loadingIndicator),
        params: {
          scrapingOffset,
          ...(options?.includeLatestHiscoreEntry ? { includeLatestHiscoreEntry: true } : {}),
          ...(options?.skipRefresh ? { skipRefresh: true } : {}),
        },
      })
      .pipe(map(player => this.#parsePlayer(player)));
  }

  /**
   * Records the lookup and starts tracking the player for `scrapingOffset`, or refreshes them when stale. Returns the
   * player like `getPlayerInfo`, or `null` when the API took us for a bot. Only call it for `isHumanVisitor()`.
   */
  trackPlayer(username: string, scrapingOffset: number): Observable<Player | null> {
    return this.httpClient
      .post<Player | null>(`/players/${encodeURIComponent(username)}/lookup`, null, { params: { scrapingOffset } })
      .pipe(map(player => (player ? this.#parsePlayer(player) : null)));
  }

  getPlayerHiscores(username: string, scrapingOffset: number, size: number, skip: number): Observable<HiscoreEntry[]> {
    return this.httpClient // Returns `null` when no hiscores have been scraped yet.
      .get<HiscoreEntry[] | null>(`/players/${encodeURIComponent(username)}/hiscores`, {
        params: { scrapingOffset, size, skip },
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

  #parsePlayer(player: Player): Player {
    return {
      ...player,
      hiscoreEntries: player.hiscoreEntries?.map(entry => ({ ...entry, date: new Date(entry.date) })),
    };
  }

  //
  // Items
  //

  searchItems(query: string): Observable<Item[] | void> {
    return this.httpClient.get<Item[]>(`/items/search/${encodeURIComponent(query)}`);
  }

  /**
   * Every item whose name starts with `letter` (`a`–`z`, or `0` for any other first character), sorted by name. A 400
   * for any other letter.
   */
  getItemsByLetter(letter: string): Observable<Pick<Item, 'id' | 'name' | 'icon'>[]> {
    return this.httpClient.get<Pick<Item, 'id' | 'name' | 'icon'>[]>(`/items/browse/${encodeURIComponent(letter)}`, {
      context: new HttpContext().set(LOADING_INDICATOR, true),
    });
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

  //
  // Player counts
  //

  // Requests refreshed every minute revalidate with the API (a 304 when unchanged) instead of using the browser cache's
  // copy (`max-age=60` live, 300 history). Not the ones SSR renders (`/latest`, the first `/live`): the transfer cache
  // leaves out a request with `cache: 'no-cache'`, so the browser would fetch it again on hydration

  /** The newest stored sample of the players online, taken every 10 minutes */
  getLatestPlayerCount(): Observable<PlayerCount> {
    return this.httpClient
      .get<PlayerCount>('/player-counts/latest')
      .pipe(map(playerCount => ({ ...playerCount, date: new Date(playerCount.date) })));
  }

  /**
   * The players online right now, from Jagex's world list (the API keeps it for up to a minute). `refresh` revalidates
   * with the API. Fails after the SSR timeout during a render, as the API may be waiting on Jagex.
   */
  getLivePlayerCount(refresh: boolean): Observable<PlayerCount> {
    return this.httpClient
      .get<PlayerCount>('/player-counts/live', {
        context: new HttpContext().set(SSR_TIMEOUT, true),
        cache: refresh ? 'no-cache' : 'default',
      })
      .pipe(map(playerCount => ({ ...playerCount, date: new Date(playerCount.date) })));
  }

  /** The players online over `range`, oldest first: 10-minute samples (24h, 7d), hourly (30d), daily (1y, all) */
  getPlayerCountHistory(range: PlayerCountRange): Observable<PlayerCountPoint[]> {
    return this.httpClient
      .get<PlayerCountPoint[]>('/player-counts', { params: { range }, cache: 'no-cache' })
      .pipe(map(points => points.map(point => ({ ...point, date: new Date(point.date) }))));
  }

  //
  // News
  //

  getNews(): Observable<OsrsNewsItem[]> {
    return this.httpClient.get<OsrsNewsItem[]>('/news');
  }

  /**
   * Every stored post, newest first, `limit` (at most 50) at a time: the first page without `before`, then the older
   * ones with the previous page's `next`. `category` is a name as Jagex uses it (`Event`, not `Events`).
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
