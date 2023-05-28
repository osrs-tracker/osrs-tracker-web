import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HiscoreEntry, Item, OsrsNewsItem, Player } from '@osrs-tracker/models';
import { Observable, map, startWith, tap } from 'rxjs';
import { StorageKey } from 'src/app/common/services/storage/storage';
import { StorageService } from 'src/app/common/services/storage/storage.service';
import { LOADING_INDICATOR } from 'src/app/core/interceptors/loading-indicator.interceptor';

@Injectable({
  providedIn: 'root',
})
export class OsrsTrackerRepo {
  constructor(private httpClient: HttpClient, private storageService: StorageService) {}

  //
  // News
  //

  getLatestOsrsNewsItems(): Observable<OsrsNewsItem[]> {
    return this.httpClient.get<OsrsNewsItem[]>('/news/latest').pipe(
      tap(osrsNewsItems => this.storageService.setItem(StorageKey.OsrsNews, JSON.stringify(osrsNewsItems))),
      startWith(JSON.parse(this.storageService.getItem(StorageKey.OsrsNews) || '[]')),
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
          hiscoreEntries: player.hiscoreEntries?.map(entry => ({ ...entry, date: new Date(entry.date) })),
        })),
      );
  }

  getPlayerHiscores(username: string, scrapingOffset = 0, size = 14, skip = 0): Observable<HiscoreEntry[]> {
    return this.httpClient // Returns `null` when no hiscores have been scraped yet.
      .get<HiscoreEntry[] | null>(`/player/${username}/hiscores`, {
        params: { scrapingOffset, size, skip },
      })
      .pipe(map(hiscoreEntries => (hiscoreEntries ?? []).map(entry => ({ ...entry, date: new Date(entry.date) }))));
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
