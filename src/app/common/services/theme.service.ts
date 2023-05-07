import { Injectable, Signal, WritableSignal, computed, signal } from '@angular/core';
import { GoogleAnalyticsService } from 'src/app/common/services/google-analytics.service';
import { StorageKey } from 'src/app/common/services/storage/storage';
import { StorageService } from 'src/app/common/services/storage/storage.service';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  #darkMode: WritableSignal<boolean> = signal(true);
  darkMode: Signal<boolean> = computed(this.#darkMode);

  constructor(private googleAnalyticsService: GoogleAnalyticsService, private storageService: StorageService) {
    const darkModeSetting = this.storageService.getItem(StorageKey.DarkMode);

    if (!darkModeSetting) this.#darkMode.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
    else this.#darkMode.set(darkModeSetting === 'true');
  }

  toggleDarkMode() {
    this.#darkMode.set(!this.darkMode());

    this.storageService.setItem(StorageKey.DarkMode, JSON.stringify(this.darkMode()));

    this.googleAnalyticsService.trackEvent('toggle_dark_mode', 'theming', 'dark_mode', this.darkMode());

    document.documentElement.classList.toggle('dark', this.darkMode());
  }
}
