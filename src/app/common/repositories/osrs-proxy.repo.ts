import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { fromJagex, JagexHiscoreJson } from '@osrs-tracker/hiscores';
import { HiscoreEntry } from '@osrs-tracker/models';
import { map, Observable } from 'rxjs';
import { BASE_URL_PREFIX } from 'src/app/core/interceptors/base-url.interceptors';
import { config } from 'src/config/config';

@Service()
export class OsrsProxyRepo {
  private readonly httpClient = inject(HttpClient);

  //
  // Players
  //

  /** Live hiscores from Jagex (through the AWS proxy), shaped like a stored hiscore entry */
  getPlayerHiscore(username: string, scrapingOffset: number): Observable<HiscoreEntry> {
    return this.httpClient
      .get<JagexHiscoreJson>(`${config.awsBaseUrl}/rs/m=hiscore_oldschool/index_lite.json`, {
        params: { player: username },
        context: new HttpContext().set(BASE_URL_PREFIX, false),
        responseType: 'json',
      })
      .pipe(
        map(json => {
          const { skills, activities } = fromJagex(json);
          return { date: new Date(), scrapingOffset, skills, activities };
        }),
      );
  }
}
