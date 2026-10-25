import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { StorageKey } from '@app/common/storage/storage';
import { StorageService } from '@app/common/storage/storage-service';
import { pushToFront, readStoredList, toggleInList, writeStoredList } from '@app/common/storage/stored-list';
import { config } from '@config/config';

export interface RecentItem {
  id: number;
  name: string;
  icon: string;
}

const sameItem = (a: RecentItem, b: RecentItem): boolean => a.id === b.id;

class PriceTrackerState {
  recentItems: RecentItem[] = [];
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
          recentItems: readStoredList<RecentItem>(storageService, StorageKey.PriceTrackerRecentItems),
          favoriteItems: readStoredList<RecentItem>(storageService, StorageKey.PriceTrackerFavoriteItems),
        });
      },

      pushRecentItem(recentItem: RecentItem): void {
        const recentItems = pushToFront(store.recentItems(), recentItem, sameItem, config.maxStoredItems);
        writeStoredList(storageService, StorageKey.PriceTrackerRecentItems, recentItems);
        patchState(store, { recentItems });
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
