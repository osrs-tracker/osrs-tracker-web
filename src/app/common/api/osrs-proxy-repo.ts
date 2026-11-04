import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { fromJagex, HiscoreTable, JagexHiscoreJson } from '@osrs-tracker/hiscores';
import { HiscoreEntry, PlayerType } from '@osrs-tracker/models';
import { map, Observable } from 'rxjs';
import { BASE_URL_PREFIX } from '@app/core/interceptors/base-url-interceptor';
import { config } from '@config/config';

/** The two builds are level-3 skillers and 1 Defence; Hardcore Worlds characters have a table of their own */
export type JagexHiscoreTable =
  HiscoreTable | 'hiscore_oldschool_skiller' | 'hiscore_oldschool_skiller_defence' | 'hiscore_oldschool_hardcore_mains';

/**
 * The table with a player's progress. A Hardcore Worlds character's entry on the main table is a stub left at
 * Tutorial Island, so its stats and ranks come from its own table only.
 */
export function liveTable(type: PlayerType | undefined): JagexHiscoreTable {
  return type === PlayerType.HardcoreMain ? 'hiscore_oldschool_hardcore_mains' : 'hiscore_oldschool';
}

@Service()
export class OsrsProxyRepo {
  private readonly httpClient = inject(HttpClient);

  /** `table` is the player's `liveTable` */
  getPlayerHiscore(username: string, scrapingOffset: number, table: JagexHiscoreTable): Observable<HiscoreEntry> {
    return this.getHiscoreTable(username, table).pipe(
      map(({ skills, activities }) => ({ date: new Date(), scrapingOffset, skills, activities })),
    );
  }

  /**
   * The player's live stats on one table, ranked among that table's accounts. A 404 when they aren't on it; the build
   * tables answer with old stats for some accounts that left them, so pick a table from the player, not by asking.
   */
  getHiscoreTable(username: string, table: JagexHiscoreTable): Observable<Pick<HiscoreEntry, 'skills' | 'activities'>> {
    return this.httpClient
      .get<JagexHiscoreJson>(this.hiscoreTableUrl(username, table), {
        context: new HttpContext().set(BASE_URL_PREFIX, false),
        responseType: 'json',
      })
      .pipe(
        map(json => {
          const { skills, activities } = fromJagex(json);
          return { skills, activities };
        }),
      );
  }

  /** The URL `getHiscoreTable` requests: a `<link rel="preload">` is only used for the exact same URL */
  hiscoreTableUrl(username: string, table: JagexHiscoreTable): string {
    return `${config.awsBaseUrl}/rs/m=${table}/index_lite.json?${new HttpParams({ fromObject: { player: username } })}`;
  }
}
