import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { HiscoreEntry } from '@osrs-tracker/models';
import { map, Observable } from 'rxjs';
import { BASE_URL_PREFIX } from 'src/app/core/interceptors/base-url.interceptors';
import { config } from 'src/config/config';

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
      .get(`${config.awsBaseUrl}/rs/m=hiscore_oldschool/index_lite.ws?player=${username}`, {
        context: new HttpContext().set(BASE_URL_PREFIX, false),
        responseType: 'text',
      })
      .pipe(
        map(hiscoreString => ({
          sourceString: hiscoreString,
          date: new Date(),
          scrapingOffset,
        })),
      );
  }
}
