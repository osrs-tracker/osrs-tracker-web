import { Service, Signal, WritableSignal, afterNextRender, computed, inject, signal } from '@angular/core';
import { AnalyticsService } from '@app/common/services/analytics/analytics-service';
import { StorageKey } from '@app/common/services/storage/storage';
import { StorageService } from '@app/common/services/storage/storage-service';

@Service()
export class ThemeService {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly storageService = inject(StorageService);

  readonly #darkMode: WritableSignal<boolean> = signal(true);
  readonly darkMode: Signal<boolean> = computed(this.#darkMode);

  constructor() {
    afterNextRender(() => {
      const darkModeSetting = this.storageService.getItem(StorageKey.DarkMode);

      if (darkModeSetting === null) this.#darkMode.set(matchMedia('(prefers-color-scheme: dark)').matches);
      else this.#darkMode.set(darkModeSetting === 'true');
    });
  }

  toggleDarkMode() {
    this.#darkMode.set(!this.darkMode());

    this.storageService.setItem(StorageKey.DarkMode, JSON.stringify(this.darkMode()));

    this.analyticsService.trackEvent('toggle_dark_mode', 'theming', 'dark_mode', this.darkMode());

    document.documentElement.classList.toggle('dark', this.darkMode());
    // The page ground (slate-900 / slate-100), as index.html sets it on load
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', this.darkMode() ? '#0f172a' : '#f1f5f9');
  }
}
