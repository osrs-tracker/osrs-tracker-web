import { Injectable } from '@angular/core';
import { StorageKey } from 'src/app/common/services/storage/storage';
import { StorageService } from 'src/app/common/services/storage/storage.service';
import { ViewType } from './player-detail/player-logs/player-logs.component';

@Injectable({
  providedIn: 'root',
})
export class XpTrackerStorageService {
  readonly MAX_PLAYERS_STORED = 5;

  constructor(private storageService: StorageService) {}

  getScrapingOffset(): number {
    return Number(this.storageService.getItem(StorageKey.XpTrackerScrapingOffset) ?? '0');
  }

  setScrapingOffset(offset: number): void {
    this.storageService.setItem(StorageKey.XpTrackerScrapingOffset, String(offset));
  }

  getRecentPlayers(): string[] {
    return JSON.parse(this.storageService.getItem(StorageKey.XpTrackerRecentPlayers) ?? '[]');
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

    this.storageService.setItem(StorageKey.XpTrackerRecentPlayers, JSON.stringify(recentPlayers));
  }

  removeRecentPlayer(username: string): void {
    const recentPlayers = this.getRecentPlayers();

    if (recentPlayers.includes(username)) {
      recentPlayers.splice(recentPlayers.indexOf(username), 1);
    }

    this.storageService.setItem(StorageKey.XpTrackerRecentPlayers, JSON.stringify(recentPlayers));
  }

  getFavoritePlayers(): string[] {
    return JSON.parse(this.storageService.getItem(StorageKey.XpTrackerFavoritePlayers) ?? '[]');
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

    this.storageService.setItem(StorageKey.XpTrackerFavoritePlayers, JSON.stringify(favoritePlayers));
  }

  getViewType(): ViewType {
    return parseInt(this.storageService.getItem(StorageKey.XpTrackerViewType)! ?? ViewType.Skills);
  }

  setViewType(viewType: ViewType): void {
    this.storageService.setItem(StorageKey.XpTrackerViewType, viewType.toString());
  }
}
