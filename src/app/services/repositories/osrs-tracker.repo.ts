import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HiscoreEntry, Item, OsrsNewsItem, Player } from '@osrs-tracker/models';
import { Observable, map, startWith, tap } from 'rxjs';
import { LOADING_INDICATOR } from 'src/app/core/interceptors/loading-indicator.interceptor';
import { StorageKey } from 'src/app/core/storage/storage';

@Injectable({
  providedIn: 'root',
})
export class OsrsTrackerRepo {
  constructor(private httpClient: HttpClient) {}

  //
  // News
  //

  getLatestOsrsNewsItems(): Observable<OsrsNewsItem[]> {
    return this.httpClient.get<OsrsNewsItem[]>('/news/latest').pipe(
      tap(osrsNewsItems => localStorage.setItem(StorageKey.OsrsNews, JSON.stringify(osrsNewsItems))),
      startWith(JSON.parse(localStorage.getItem(StorageKey.OsrsNews) || '[]')),
    );
  }

  //
  // Players
  //

  getPlayerInfo(
    username: string,
    options?: { includeLatestHiscoreEntry?: boolean; loadingIndicator?: boolean },
  ): Observable<Player> {
    return this.httpClient
      .get<Player>(`/player/${username}`, {
        context: new HttpContext().set(LOADING_INDICATOR, options?.loadingIndicator),
        params: { ...(options?.includeLatestHiscoreEntry ? { hiscore: true } : {}) },
      })
      .pipe(
        map(player => ({
          ...player,
          hiscoreEntries: player.hiscoreEntries?.map(hiscoreEntry => {
            return {
              ...hiscoreEntry,
              date: new Date(hiscoreEntry.date),
            };
          }),
        })),
      );
  }

  getPlayerHiscores(username: string, scrapingOffset = 0, skip = 0): Observable<HiscoreEntry[]> {
    return this.httpClient
      .get<HiscoreEntry[]>(`/player/${username}/hiscores`, {
        params: { scrapingOffset, skip },
      })
      .pipe(
        map(hiscoreEntries =>
          hiscoreEntries.map(hiscoreEntry => {
            return {
              ...hiscoreEntry,
              date: new Date(hiscoreEntry.date),
            };
          }),
        ),
      );
  }

  //
  // Items
  //

  searchItems(query: string): Observable<Item[]> {
    return this.httpClient.get<Item[]>(`/item/search/${query}`);
  }

  getItemInfo(itemId: number, options?: { loadingIndicator: boolean }): Observable<Item> {
    return this.httpClient.get<Item>(`/item/${itemId}`, {
      context: new HttpContext().set(LOADING_INDICATOR, options?.loadingIndicator),
    });
  }
}
