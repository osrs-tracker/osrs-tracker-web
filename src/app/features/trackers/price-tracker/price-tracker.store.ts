import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { StorageKey } from 'src/app/common/services/storage/storage';
import { StorageService } from 'src/app/common/services/storage/storage.service';
import { config } from 'src/config/config';

export interface RecentItem {
  id: number;
  name: string;
  icon: string;
}

export class PriceTrackerState {
  recentItems: RecentItem[] = [];
  favoriteItems: RecentItem[] = [];
}

export const PriceTrackerStore = signalStore(
  { providedIn: 'root' },
  withState(new PriceTrackerState()),
  withMethods(() => ({
    readStoredItems(key: StorageKey): RecentItem[] {
      const storageService = inject(StorageService);
      const storedValue = storageService.getItem(key);

      if (!storedValue) return [];

      // Stored values can be corrupted or edited by hand, fall back to no items instead of breaking the page
      try {
        const items: unknown = JSON.parse(storedValue);
        return Array.isArray(items) ? items : [];
      } catch {
        return [];
      }
    },
  })),
  withMethods(store => {
    const storageService = inject(StorageService);

    return {
      loadFromStorage(): void {
        patchState(store, {
          recentItems: store.readStoredItems(StorageKey.PriceTrackerRecentItems),
          favoriteItems: store.readStoredItems(StorageKey.PriceTrackerFavoriteItems),
        });
      },

      pushRecentItem(recentItem: RecentItem): void {
        const recentItems = store.recentItems().filter(item => item.id !== recentItem.id);

        recentItems.unshift(recentItem);

        if (recentItems.length > config.maxStoredItems) {
          recentItems.pop();
        }

        storageService.setItem(StorageKey.PriceTrackerRecentItems, JSON.stringify(recentItems));
        patchState(store, { recentItems });
      },

      isFavoriteItem(id: number): boolean {
        return store.favoriteItems().some(item => item.id === id);
      },

      toggleFavoriteItem(recentItem: RecentItem): void {
        const favoriteItems = store.favoriteItems().filter(item => item.id !== recentItem.id);

        if (favoriteItems.length === store.favoriteItems().length) {
          favoriteItems.unshift(recentItem);
        }

        storageService.setItem(StorageKey.PriceTrackerFavoriteItems, JSON.stringify(favoriteItems));
        patchState(store, { favoriteItems });
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadFromStorage();
    },
  }),
);
