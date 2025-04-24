import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { HiscoreEntry, Item, Player } from '@osrs-tracker/models';
import { Observable, map } from 'rxjs';
import { LOADING_INDICATOR } from 'src/app/core/interceptors/loading-indicator.interceptor';

@Injectable({
  providedIn: 'root',
})
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
      .get<Player>(`/players/${username}`, {
        context: new HttpContext().set(LOADING_INDICATOR, options?.loadingIndicator),
        params: {
          scrapingOffset,
          ...(options?.includeLatestHiscoreEntry ? { includeLatestHiscoreEntry: true } : {}),
          ...(options?.skipRefresh ? { skipRefresh: true } : {}),
        },
      })
      .pipe(
        map(player => ({
          ...player,
          hiscoreEntries: player.hiscoreEntries?.map(entry => ({ ...entry, date: new Date(entry.date) })),
        })),
      );
  }

  getPlayerHiscores(username: string, scrapingOffset: number, size: number, skip: number): Observable<HiscoreEntry[]> {
    return this.httpClient // Returns `null` when no hiscores have been scraped yet.
      .get<HiscoreEntry[] | null>(`/players/${username}/hiscores`, { params: { scrapingOffset, size, skip } })
      .pipe(map(hiscoreEntries => (hiscoreEntries ?? []).map(entry => ({ ...entry, date: new Date(entry.date) }))));
  }

  getRecentPlayerLookups(): Observable<Player[]> {
    return this.httpClient.get<Player[]>('/players').pipe(
      map(players =>
        players.map(player => ({
          ...player,
          hiscoreEntries: player.hiscoreEntries?.map(entry => ({ ...entry, date: new Date(entry.date) })),
        })),
      ),
    );
  }

  //
  // Items
  //

  searchItems(query: string): Observable<Item[] | void> {
    return this.httpClient.get<Item[]>(`/items/search/${query}`);
  }

  getItemInfo(itemId: number, options?: { loadingIndicator: boolean }): Observable<Item> {
    return this.httpClient.get<Item>(`/items/${itemId}`, {
      context: new HttpContext().set(LOADING_INDICATOR, options?.loadingIndicator),
    });
  }

  getRecentItemLookups(): Observable<Item[]> {
    return this.httpClient.get<Item[]>('/items');
  }
}
