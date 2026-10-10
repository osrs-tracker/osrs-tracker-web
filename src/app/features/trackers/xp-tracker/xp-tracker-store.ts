import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { StorageKey } from '@app/common/services/storage/storage';
import { StorageService } from '@app/common/services/storage/storage-service';
import { config } from '@config/config';

export class XpTrackerState {
  scrapingOffset = 0;
  recentPlayers: string[] = [];
  favoritePlayers: string[] = [];
}

export const XpTrackerStore = signalStore(
  { providedIn: 'root' },
  withState(new XpTrackerState()),
  withMethods(() => ({
    readStoredPlayers(key: StorageKey): string[] {
      const storageService = inject(StorageService);
      const storedValue = storageService.getItem(key);

      if (!storedValue) return [];

      try {
        const players: unknown = JSON.parse(storedValue);
        return Array.isArray(players) ? players : [];
      } catch {
        return [];
      }
    },
  })),
  withMethods(store => {
    const storageService = inject(StorageService);

    return {
      loadFromStorage(): void {
        // Stored values can be corrupted or edited by hand, fall back to the defaults instead of breaking the page
        const scrapingOffset = Number(storageService.getItem(StorageKey.XpTrackerScrapingOffset) ?? '0');

        patchState(store, {
          scrapingOffset: Number.isInteger(scrapingOffset) ? scrapingOffset : 0,
          recentPlayers: store.readStoredPlayers(StorageKey.XpTrackerRecentPlayers),
          favoritePlayers: store.readStoredPlayers(StorageKey.XpTrackerFavoritePlayers),
        });
      },

      setScrapingOffset(offset: number): void {
        storageService.setItem(StorageKey.XpTrackerScrapingOffset, String(offset));
        patchState(store, { scrapingOffset: offset });
      },

      pushRecentPlayer(username: string): void {
        const recentPlayers = [...store.recentPlayers()];
        const existingIndex = recentPlayers.indexOf(username);

        if (existingIndex >= 0) {
          recentPlayers.splice(existingIndex, 1);
        }

        recentPlayers.unshift(username);

        if (recentPlayers.length > config.maxStoredPlayers) {
          recentPlayers.pop();
        }

        storageService.setItem(StorageKey.XpTrackerRecentPlayers, JSON.stringify(recentPlayers));
        patchState(store, { recentPlayers });
      },

      removeRecentPlayer(username: string): void {
        const recentPlayers = store.recentPlayers().filter(player => player !== username);

        storageService.setItem(StorageKey.XpTrackerRecentPlayers, JSON.stringify(recentPlayers));
        patchState(store, { recentPlayers });
      },

      isFavoritePlayer(username: string): boolean {
        return store.favoritePlayers().includes(username);
      },

      toggleFavoritePlayer(username: string): void {
        const favoritePlayers = [...store.favoritePlayers()];
        const favoriteIndex = favoritePlayers.indexOf(username);

        if (favoriteIndex >= 0) {
          favoritePlayers.splice(favoriteIndex, 1);
        } else {
          favoritePlayers.unshift(username);
        }

        storageService.setItem(StorageKey.XpTrackerFavoritePlayers, JSON.stringify(favoritePlayers));
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
