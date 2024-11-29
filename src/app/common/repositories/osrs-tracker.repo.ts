import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { HiscoreEntry, Item, OsrsNewsItem, Player } from '@osrs-tracker/models';
import { Observable, map } from 'rxjs';
import { LOADING_INDICATOR } from 'src/app/core/interceptors/loading-indicator.interceptor';

@Injectable({
  providedIn: 'root',
})
export class OsrsTrackerRepo {
  private readonly httpClient = inject(HttpClient);

  //
  // News
  //

  getLatestOsrsNewsItems(): Observable<OsrsNewsItem[]> {
    return this.httpClient.get<OsrsNewsItem[]>('/news/latest');
  }

  //
  // Players
  //

  getPlayerInfo(
    username: string,
    scrapingOffset: number,
    options?: { includeLatestHiscoreEntry?: boolean; loadingIndicator?: boolean },
  ): Observable<Player> {
    return this.httpClient
      .get<Player>(`/player/${username}`, {
        context: new HttpContext().set(LOADING_INDICATOR, options?.loadingIndicator),
        params: {
          scrapingOffset,
          ...(options?.includeLatestHiscoreEntry ? { hiscore: true } : {}),
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
      .get<HiscoreEntry[] | null>(`/player/${username}/hiscores`, { params: { scrapingOffset, size, skip } })
      .pipe(map(hiscoreEntries => (hiscoreEntries ?? []).map(entry => ({ ...entry, date: new Date(entry.date) }))));
  }

  //
  // Items
  //

  searchItems(query: string): Observable<Item[] | void> {
    return this.httpClient.get<Item[]>(`/item/search/${query}`);
  }

  getItemInfo(itemId: number, options?: { loadingIndicator: boolean }): Observable<Item> {
    return this.httpClient.get<Item>(`/item/${itemId}`, {
      context: new HttpContext().set(LOADING_INDICATOR, options?.loadingIndicator),
    });
  }
}
