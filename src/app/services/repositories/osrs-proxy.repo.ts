import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HiscoreEntry } from '@osrs-tracker/models';
import parse from 'rss-to-json';
import { from, map, Observable, startWith, tap } from 'rxjs';
import { apiConfig } from 'src/config/api.config';
import { StorageKey } from '../../core/storage/storage';

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
  constructor(private httpClient: HttpClient) {}

  getOSRSNews(): Observable<OsrsNewsItem[]> {
    return from(parse(`${apiConfig.baseUrl}/rs/m=news/latest_news.rss?oldschool=true`)).pipe(
      map(rss =>
        rss.items.map(
          item =>
            new OsrsNewsItem(item.title, new Date(item.published), item.category, item.link, item.description, {
              url: item.enclosures[0].url,
              type: item.enclosures[0].type,
            }),
        ),
      ),
      tap(osrsNewsItems => localStorage.setItem(StorageKey.OsrsNews, JSON.stringify(osrsNewsItems))),
      startWith(JSON.parse(localStorage.getItem(StorageKey.OsrsNews) || '[]')),
    );
  }

  getPlayerHiscore(username: string): Observable<HiscoreEntry> {
    return this.httpClient
      .get(`/rs/m=hiscore_oldschool/index_lite.ws?player=${username}`, {
        responseType: 'text',
      })
      .pipe(
        map(hiscoreString => ({
          sourceString: hiscoreString,
          date: new Date(),
          scrapingOffset: 0,
        })),
      );
  }
}
