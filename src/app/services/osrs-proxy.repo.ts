import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, startWith, tap } from 'rxjs';
import { ElementCompact, xml2js } from 'xml-js';
import { StorageKey } from '../core/storage/storage';

export class OsrsNewsItem {
  constructor(
    public title: string,
    public pubDate: Date | null,
    public categories: string[],
    public link: string,
    public description: string,
    public enclosure: {
      link: string;
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
    return this.httpClient.get('/rs/m=news/latest_news.rss?oldschool=true', { responseType: 'text' }).pipe(
      map((xmlRss) => xml2js(xmlRss, { compact: true })),
      map((xml: ElementCompact) =>
        xml['rss'].channel.item.map(
          (item: ElementCompact) =>
            new OsrsNewsItem(
              item['title']._text,
              item['pubDate']._text,
              [item['category']._text],
              item['link']._text,
              item['description']._text,
              {
                link: item['enclosure']._attributes.url,
                type: item['enclosure']._attributes.type,
              },
            ),
        ),
      ),
      // cache in local storage
      tap((osrsNewsItems) => localStorage.setItem(StorageKey.OsrsNews, JSON.stringify(osrsNewsItems))),
      // start with cached data
      startWith(JSON.parse(localStorage.getItem(StorageKey.OsrsNews) || '[]')),
    );
  }
}
