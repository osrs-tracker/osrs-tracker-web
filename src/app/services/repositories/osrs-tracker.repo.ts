import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HiscoreEntry, Item, OsrsNewsItem, Player } from '@osrs-tracker/models';
import { Observable, startWith, tap } from 'rxjs';
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

  getPlayerInfo(username: string, includeLatestHiscoreEntry?: boolean): Observable<Player> {
    return this.httpClient.get<Player>(`/player/${username}`, {
      params: { ...(includeLatestHiscoreEntry ? { hiscore: true } : {}) },
    });
  }

  getPlayerHiscores(username: string, scrapingOffset = 0, skip = 0): Observable<HiscoreEntry[]> {
    return this.httpClient.get<HiscoreEntry[]>(`/player/${username}/hiscores`, {
      params: { scrapingOffset, skip },
    });
  }

  //
  // Items
  //

  searchItems(query: string): Observable<Item[]> {
    return this.httpClient.get<Item[]>(`/item/search/${query}`);
  }

  getItemInfo(itemId: number): Observable<Item> {
    return this.httpClient.get<Item>(`/item/${itemId}`);
  }
}
