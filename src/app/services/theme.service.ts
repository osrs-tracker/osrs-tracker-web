import { Injectable } from '@angular/core';
import { GoogleAnalyticsService } from 'src/app/services/google-analytics.service';
import { StorageKey } from 'src/app/services/storage/storage';
import { StorageService } from 'src/app/services/storage/storage.service';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  constructor(private googleAnalyticsService: GoogleAnalyticsService, private storageService: StorageService) {}

  get isDarkModeEnabled(): boolean {
    const darkModeSetting = this.storageService.getItem(StorageKey.DarkMode);

    if (!darkModeSetting) return window.matchMedia('(prefers-color-scheme: dark)').matches;
    else return darkModeSetting === 'true';
  }

  toggleDarkMode() {
    this.storageService.setItem(StorageKey.DarkMode, this.isDarkModeEnabled ? 'false' : 'true');

    this.googleAnalyticsService.trackEvent('toggle_dark_mode', 'theming', 'dark_mode', this.isDarkModeEnabled);

    document.documentElement.classList.toggle('dark', this.isDarkModeEnabled);
  }
}
