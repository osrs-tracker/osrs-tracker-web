import { inject, Service } from '@angular/core';
import { StorageKey } from 'src/app/common/services/storage/storage';
import { StorageService } from 'src/app/common/services/storage/storage.service';
import { config } from 'src/config/config';

export interface RecentItem {
  id: number;
  name: string;
  icon: string;
}

@Service()
export class PriceTrackerStorageService {
  private readonly storageService = inject(StorageService);

  getRecentItems(): RecentItem[] {
    return this.readStoredItems(StorageKey.PriceTrackerRecentItems);
  }

  pushRecentItem(recentItem: RecentItem): void {
    const recenItems = this.getRecentItems();

    const existingItem = recenItems.find(item => item.id === recentItem.id);

    if (existingItem) {
      recenItems.splice(recenItems.indexOf(existingItem), 1);
    }

    recenItems.unshift(recentItem);

    if (recenItems.length > config.maxStoredItems) {
      recenItems.pop();
    }

    this.storageService.setItem(StorageKey.PriceTrackerRecentItems, JSON.stringify(recenItems));
  }

  getFavoriteItems(): RecentItem[] {
    return this.readStoredItems(StorageKey.PriceTrackerFavoriteItems);
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

  /** Stored values can be corrupted or edited by hand, fall back to no items instead of breaking the page */
  private readStoredItems(key: StorageKey): RecentItem[] {
    try {
      const items: unknown = JSON.parse(this.storageService.getItem(key) ?? '[]');
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }
}
