import { Injectable } from '@angular/core';
import { GoogleAnalyticsService } from 'src/app/core/analytics/google-analytics.service';
import { StorageKey } from 'src/app/core/storage/storage';
import { StorageService } from 'src/app/core/storage/storage.service';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  constructor(private googleAnalyticsService: GoogleAnalyticsService, private storageService: StorageService) {}

  get isDarkModeEnabled(): boolean {
    return (this.storageService.getItem(StorageKey.DarkMode) ?? 'true') === 'true'; // set darkMode as default
  }

  loadTheme() {
    this.googleAnalyticsService.trackEvent('load_theme', 'theming', 'theme', this.isDarkModeEnabled ? 'dark' : 'light');

    document.documentElement.classList.toggle('dark', this.isDarkModeEnabled);
  }

  toggleDarkMode() {
    this.storageService.setItem(StorageKey.DarkMode, this.isDarkModeEnabled ? 'false' : 'true');

    this.googleAnalyticsService.trackEvent('toggle_dark_mode', 'theming', 'dark_mode', this.isDarkModeEnabled);

    document.documentElement.classList.toggle('dark', this.isDarkModeEnabled);
  }
}
