import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { StorageKey } from '@app/common/storage/storage';
import { StorageService } from '@app/common/storage/storage-service';
import { pushToFront, readStoredList, toggleInList, writeStoredList } from '@app/common/storage/stored-list';
import { config } from '@config/config';

const samePlayer = (a: string, b: string): boolean => a === b;

class XpTrackerState {
  scrapingOffset = 0;
  recentPlayers: string[] = [];
  favoritePlayers: string[] = [];
}

export const XpTrackerStore = signalStore(
  { providedIn: 'root' },
  withState(new XpTrackerState()),
  withMethods(store => {
    const storageService = inject(StorageService);

    return {
      loadFromStorage(): void {
        // Stored values can be corrupted or edited by hand, fall back to the defaults instead of breaking the page
        const scrapingOffset = Number(storageService.getItem(StorageKey.XpTrackerScrapingOffset) ?? '0');

        patchState(store, {
          scrapingOffset: Number.isInteger(scrapingOffset) ? scrapingOffset : 0,
          recentPlayers: readStoredList<string>(storageService, StorageKey.XpTrackerRecentPlayers),
          favoritePlayers: readStoredList<string>(storageService, StorageKey.XpTrackerFavoritePlayers),
        });
      },

      setScrapingOffset(offset: number): void {
        storageService.setItem(StorageKey.XpTrackerScrapingOffset, String(offset));
        patchState(store, { scrapingOffset: offset });
      },

      pushRecentPlayer(username: string): void {
        const recentPlayers = pushToFront(store.recentPlayers(), username, samePlayer, config.maxStoredPlayers);
        writeStoredList(storageService, StorageKey.XpTrackerRecentPlayers, recentPlayers);
        patchState(store, { recentPlayers });
      },

      removeRecentPlayer(username: string): void {
        const recentPlayers = store.recentPlayers().filter(player => player !== username);

        writeStoredList(storageService, StorageKey.XpTrackerRecentPlayers, recentPlayers);
        patchState(store, { recentPlayers });
      },

      isFavoritePlayer(username: string): boolean {
        return store.favoritePlayers().includes(username);
      },

      toggleFavoritePlayer(username: string): void {
        const favoritePlayers = toggleInList(store.favoritePlayers(), username, samePlayer);
        writeStoredList(storageService, StorageKey.XpTrackerFavoritePlayers, favoritePlayers);
        patchState(store, { favoritePlayers });
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadFromStorage();
    },
  }),
);
