import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { HiscoreEntry, Item, Player } from '@osrs-tracker/models';
import { Observable, map } from 'rxjs';
import { LOADING_INDICATOR } from '@app/core/interceptors/loading-indicator-interceptor';
import { config } from '@config/config';

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

  /** Each player's `hiscoreEntries` holds only their newest entry for `scrapingOffset`, or none */
  getRecentPlayerLookups(scrapingOffset: number): Observable<Player[]> {
    return this.httpClient
      .get<Player[]>('/players', { params: { limit: config.maxStoredPlayers, scrapingOffset } })
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
  // News
  //

  getNews(): Observable<OsrsNewsItem[]> {
    return this.httpClient.get<OsrsNewsItem[]>('/news');
  }
}
