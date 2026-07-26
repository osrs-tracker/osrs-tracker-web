import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { StorageKey } from 'src/app/common/services/storage/storage';
import { StorageService } from 'src/app/common/services/storage/storage.service';
import { config } from 'src/config/config';
import { XpTrackerViewType } from './xp-tracker-view-type';

export class XpTrackerState {
  scrapingOffset = 0;
  recentPlayers: string[] = [];
  favoritePlayers: string[] = [];
  viewType: XpTrackerViewType = XpTrackerViewType.Skills;
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
        return JSON.parse(storedValue);
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
          scrapingOffset: Number(storageService.getItem(StorageKey.XpTrackerScrapingOffset) ?? '0'),
          recentPlayers: store.readStoredPlayers(StorageKey.XpTrackerRecentPlayers),
          favoritePlayers: store.readStoredPlayers(StorageKey.XpTrackerFavoritePlayers),
          viewType: Number(storageService.getItem(StorageKey.XpTrackerViewType) ?? XpTrackerViewType.Skills),
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

      setViewType(viewType: XpTrackerViewType): void {
        storageService.setItem(StorageKey.XpTrackerViewType, viewType.toString());
        patchState(store, { viewType });
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadFromStorage();
    },
  }),
);
