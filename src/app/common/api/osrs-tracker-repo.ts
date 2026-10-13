import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { HiscoreEntry, Item, Player, PlayerCount } from '@osrs-tracker/models';
import { Observable, map } from 'rxjs';
import { LOADING_INDICATOR } from '@app/core/interceptors/loading-indicator-interceptor';
import { config } from '@config/config';

/** How far back the player count history goes, and its step: 10-minute samples (24h, 7d), hourly (30d), daily (1y, all) */
export type PlayerCountRange = '24h' | '7d' | '30d' | '1y' | 'all';

/** A sample of the player count history, or the averages over the UTC hour or day starting at `date` */
export interface PlayerCountPoint {
  date: Date;
  total: number;
  members: number;
  f2p: number;
  /** Players per raw location code; in an hour or a day, the average per code */
  byLocation: Record<string, number>;
  /** Daily points only: the highest count sampled that day */
  peak?: number;
}

export class OsrsNewsItem {
  constructor(
    public title: string,
    public pubDate: Date | null,
    public category: string,
    public link: string,
    public description: string,
    public enclosure: {
      url: string;
      type: string;
    },
  ) {}
}

/** A news post's image (a `cdn.runescape.com` URL) through the API, as WebP */
export function newsImageUrl(url: string): string {
  return `${config.apiBaseUrl}/news/image?url=${encodeURIComponent(url)}`;
}

/** A stored news post; the older ones may have no `description` or `enclosure` (they're being backfilled) */
export interface NewsPost {
  title: string;
  pubDate: Date;
  category: string;
  link: string;
  description?: string;
  enclosure?: { url: string; type: string };
}

/** A page of the news archive; `next` is the cursor for the older posts, `null` on the last page */
export interface NewsArchivePage {
  posts: NewsPost[];
  next: string | null;
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

  // The browser's refreshes revalidate with the API (a 304 when unchanged) instead of using the browser cache's copy
  // (`max-age=60` on the live count, 300 on the rest), so they see the newest count

  /** The newest stored sample of the players online, taken every 10 minutes */
  getLatestPlayerCount(): Observable<PlayerCount> {
    return this.httpClient
      .get<PlayerCount>('/player-counts/latest', { cache: 'no-cache' })
      .pipe(map(playerCount => ({ ...playerCount, date: new Date(playerCount.date) })));
  }

  /** The players online right now, from Jagex's world list (the API keeps it for up to a minute). Browser only. */
  getLivePlayerCount(): Observable<PlayerCount> {
    return this.httpClient
      .get<PlayerCount>('/player-counts/live', { cache: 'no-cache' })
      .pipe(map(playerCount => ({ ...playerCount, date: new Date(playerCount.date) })));
  }

  /** The players online over `range`, oldest first */
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
