import { Injectable } from '@angular/core';
import { StorageKey } from 'src/app/core/storage/storage';
import { ViewType } from './player-detail/player-logs/player-logs.component';

@Injectable({
  providedIn: 'root',
})
export class XpTrackerService {
  readonly MAX_PLAYERS_STORED = 5;

  getRecentPlayers(): string[] {
    return JSON.parse(localStorage.getItem(StorageKey.XpTrackerRecentPlayers) ?? '[]');
  }

  pushRecentPlayer(username: string): void {
    const recentPlayers = this.getRecentPlayers();

    if (recentPlayers.includes(username)) {
      recentPlayers.splice(recentPlayers.indexOf(username), 1);
    }

    recentPlayers.unshift(username);

    if (recentPlayers.length > this.MAX_PLAYERS_STORED) {
      recentPlayers.pop();
    }

    localStorage.setItem(StorageKey.XpTrackerRecentPlayers, JSON.stringify(recentPlayers));
  }

  getFavoritePlayers(): string[] {
    return JSON.parse(localStorage.getItem(StorageKey.XpTrackerFavoritePlayers) ?? '[]');
  }

  isFavoritePlayer(username: string): boolean {
    return this.getFavoritePlayers().includes(username);
  }

  toggleFavoritePlayer(username: string): void {
    const favoritePlayers = this.getFavoritePlayers();

    if (favoritePlayers.includes(username)) {
      favoritePlayers.splice(favoritePlayers.indexOf(username), 1);
    } else {
      favoritePlayers.unshift(username);
    }

    localStorage.setItem(StorageKey.XpTrackerFavoritePlayers, JSON.stringify(favoritePlayers));
  }

  getViewType(): ViewType {
    return parseInt(localStorage.getItem(StorageKey.XpTrackerViewType)! ?? ViewType.Skills);
  }

  setViewType(viewType: ViewType): void {
    localStorage.setItem(StorageKey.XpTrackerViewType, viewType.toString());
  }
}
