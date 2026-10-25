import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { StorageKey } from './storage';
import { StorageService } from './storage-service';

/** Not today (UTC): "posts since today" are always none. */
export function parseDay(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const day = new Date(`${value}T00:00:00Z`);
  // `Date` rolls a day that doesn't exist (2026-02-31) over into the next month
  if (isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== value) return null;
  if (value >= new Date().toISOString().slice(0, 10)) return null;
  return value;
}

class LastPlayedState {
  lastPlayed: string | null = null;
}

/** In `common/`, as the nav (in `core/`) reads it too. */
export const LastPlayedStore = signalStore(
  { providedIn: 'root' },
  withState(new LastPlayedState()),
  withMethods(store => {
    const storageService = inject(StorageService);

    return {
      loadFromStorage(): void {
        patchState(store, { lastPlayed: parseDay(storageService.getItem(StorageKey.NewsLastPlayed)) });
      },

      setLastPlayed(day: string): void {
        storageService.setItem(StorageKey.NewsLastPlayed, day);
        patchState(store, { lastPlayed: day });
      },

      clearLastPlayed(): void {
        storageService.removeItem(StorageKey.NewsLastPlayed);
        patchState(store, { lastPlayed: null });
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadFromStorage();
    },
  }),
);
