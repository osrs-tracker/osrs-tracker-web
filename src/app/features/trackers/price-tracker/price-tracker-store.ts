import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { StorageKey } from '@app/common/storage/storage';
import { StorageService } from '@app/common/storage/storage-service';
import { pushToFront, readStoredList, toggleInList, writeStoredList } from '@app/common/storage/stored-list';
import { PriceWorld } from '@app/common/api/price-world';
import { config } from '@config/config';

export interface RecentItem {
  id: number;
  name: string;
  icon: string;
}

const RECENT_KEYS: Record<PriceWorld, StorageKey> = {
  main: StorageKey.PriceTrackerRecentItems,
  hardcore: StorageKey.PriceTrackerHardcoreRecentItems,
};

const sameItem = (a: RecentItem, b: RecentItem): boolean => a.id === b.id;

class PriceTrackerState {
  recentItems: Record<PriceWorld, RecentItem[]> = { main: [], hardcore: [] };
  favoriteItems: RecentItem[] = [];
}

export const PriceTrackerStore = signalStore(
  { providedIn: 'root' },
  withState(new PriceTrackerState()),
  withMethods(store => {
    const storageService = inject(StorageService);

    return {
      loadFromStorage(): void {
        patchState(store, {
          recentItems: {
            main: readStoredList<RecentItem>(storageService, RECENT_KEYS.main),
            hardcore: readStoredList<RecentItem>(storageService, RECENT_KEYS.hardcore),
          },
          favoriteItems: readStoredList<RecentItem>(storageService, StorageKey.PriceTrackerFavoriteItems),
        });
      },

      pushRecentItem(recentItem: RecentItem, world: PriceWorld = 'main'): void {
        const recent = pushToFront(store.recentItems()[world], recentItem, sameItem, config.maxStoredItems);
        writeStoredList(storageService, RECENT_KEYS[world], recent);
        patchState(store, { recentItems: { ...store.recentItems(), [world]: recent } });
      },

      isFavoriteItem(id: number): boolean {
        return store.favoriteItems().some(item => item.id === id);
      },

      toggleFavoriteItem(recentItem: RecentItem): void {
        const favoriteItems = toggleInList(store.favoriteItems(), recentItem, sameItem);
        writeStoredList(storageService, StorageKey.PriceTrackerFavoriteItems, favoriteItems);
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
