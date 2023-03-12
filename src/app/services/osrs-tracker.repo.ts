import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Player } from '@osrs-tracker/models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OsrsTrackerRepo {
  constructor(private httpClient: HttpClient) {}

  getPlayerInfo(username: string): Observable<Player> {
    return this.httpClient.get<Player>(`/player/${username}`);
  }
}
