import { Injectable, inject } from '@angular/core';
import { StorageKey } from 'src/app/common/services/storage/storage';
import { StorageService } from 'src/app/common/services/storage/storage.service';

export interface RecentItem {
  id: number;
  name: string;
  icon: string;
}

@Injectable({
  providedIn: 'root',
})
export class PriceTrackerStorageService {
  private readonly storageService = inject(StorageService);

  readonly MAX_PLAYERS_STORED = 5;

  getRecentItems(): RecentItem[] {
    return JSON.parse(this.storageService.getItem(StorageKey.PriceTrackerRecentItems) ?? '[]');
  }

  pushRecentItem(recentItem: RecentItem): void {
    const recenItems = this.getRecentItems();

    const existingItem = recenItems.find(item => item.id === recentItem.id);

    if (existingItem) {
      recenItems.splice(recenItems.indexOf(existingItem), 1);
    }

    recenItems.unshift(recentItem);

    if (recenItems.length > this.MAX_PLAYERS_STORED) {
      recenItems.pop();
    }

    this.storageService.setItem(StorageKey.PriceTrackerRecentItems, JSON.stringify(recenItems));
  }

  getFavoriteItems(): RecentItem[] {
    return JSON.parse(this.storageService.getItem(StorageKey.PriceTrackerFavoriteItems) ?? '[]');
  }

  isFavoriteItem(id: number): boolean {
    return this.getFavoriteItems().some(item => item.id === id);
  }

  toggleFavoriteItem(recentItem: RecentItem): void {
    const favoriteItems = this.getFavoriteItems();

    const existingItem = favoriteItems.find(item => item.id === recentItem.id);

    if (existingItem) {
      favoriteItems.splice(favoriteItems.indexOf(existingItem), 1);
    } else {
      favoriteItems.unshift(recentItem);
    }

    this.storageService.setItem(StorageKey.PriceTrackerFavoriteItems, JSON.stringify(favoriteItems));
  }
}
