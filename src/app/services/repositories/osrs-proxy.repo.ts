import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HiscoreEntry } from '@osrs-tracker/models';
import { map, Observable, startWith, tap } from 'rxjs';
import { StorageKey } from '../../core/storage/storage';
import { NewsService } from '../news/news.service';

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

@Injectable({
  providedIn: 'root',
})
export class OsrsProxyRepo {
  constructor(private httpClient: HttpClient, private rssService: NewsService) {}

  //
  // News
  //

  /** will use prefetched url when visiting home directly */
  getOSRSNews(): Observable<OsrsNewsItem[]> {
    return this.httpClient.get('/rs/m=news/latest_news.rss?oldschool=true', { responseType: 'text' }).pipe(
      map(rss => this.rssService.parseRss(rss)),
      tap(osrsNewsItems => localStorage.setItem(StorageKey.OsrsNews, JSON.stringify(osrsNewsItems))),
      startWith(JSON.parse(localStorage.getItem(StorageKey.OsrsNews) || '[]')),
    );
  }

  //
  // Players
  //

  getPlayerHiscore(username: string): Observable<HiscoreEntry> {
    return this.httpClient
      .get(`/rs/m=hiscore_oldschool/index_lite.ws?player=${username}`, { responseType: 'text' })
      .pipe(
        map(hiscoreString => ({
          sourceString: hiscoreString,
          date: new Date(),
          scrapingOffset: 0,
        })),
      );
  }
}
