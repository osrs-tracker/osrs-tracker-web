import { Injectable, Signal, WritableSignal, afterNextRender, computed, inject, signal } from '@angular/core';
import { AnalyticsService } from 'src/app/common/services/analytics/analytics.service';
import { StorageKey } from 'src/app/common/services/storage/storage';
import { StorageService } from 'src/app/common/services/storage/storage.service';

@Injectable({
  providedIn: 'root',
})
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
  }
}
