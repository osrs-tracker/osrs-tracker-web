import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { HiscoreEntry } from '@osrs-tracker/models';
import { map, Observable } from 'rxjs';

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
  private readonly httpClient = inject(HttpClient);

  //
  // Players
  //

  getPlayerHiscore(username: string, scrapingOffset: number): Observable<HiscoreEntry> {
    return this.httpClient
      .get(`/rs/m=hiscore_oldschool/index_lite.ws?player=${username}`, { responseType: 'text' })
      .pipe(
        map(hiscoreString => ({
          sourceString: hiscoreString,
          date: new Date(),
          scrapingOffset,
        })),
      );
  }
}
