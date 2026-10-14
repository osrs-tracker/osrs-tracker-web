import { DOCUMENT } from '@angular/common';
import { afterNextRender, inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { StorageKey } from '@app/common/storage/storage';
import { StorageService } from '@app/common/storage/storage-service';

class ThemeState {
  /** Dark until the browser reads the stored choice: most visitors use it, and `index.html` sets the class first */
  darkMode = true;
}

export const ThemeStore = signalStore(
  { providedIn: 'root' },
  withState(new ThemeState()),
  withMethods(store => {
    const analyticsService = inject(AnalyticsService);
    const document = inject(DOCUMENT);
    const storageService = inject(StorageService);

    return {
      loadFromStorage(): void {
        const darkModeSetting = storageService.getItem(StorageKey.DarkMode);

        patchState(store, {
          darkMode:
            darkModeSetting === null ? matchMedia('(prefers-color-scheme: dark)').matches : darkModeSetting === 'true',
        });
      },

      toggleDarkMode(): void {
        const darkMode = !store.darkMode();
        patchState(store, { darkMode });

        storageService.setItem(StorageKey.DarkMode, JSON.stringify(darkMode));

        analyticsService.trackEvent('toggle_dark_mode', { theme: darkMode ? 'dark' : 'light' });

        document.documentElement.classList.toggle('dark', darkMode);
        // The page ground (slate-900 / slate-100), as index.html sets it on load
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', darkMode ? '#0f172a' : '#f1f5f9');
      },
    };
  }),
  withHooks({
    onInit(store) {
      afterNextRender(() => store.loadFromStorage());
    },
  }),
);
