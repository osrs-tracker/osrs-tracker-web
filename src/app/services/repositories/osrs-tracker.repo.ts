import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HiscoreEntry, Player } from '@osrs-tracker/models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OsrsTrackerRepo {
  constructor(private httpClient: HttpClient) {}

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
}
