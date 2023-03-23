import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DarkModeService {
  get isDarkModeEnabled(): boolean {
    // set darkMode as default
    return (localStorage.getItem('darkMode') ?? 'true') === 'true';
  }

  toggleDarkMode() {
    localStorage.setItem('darkMode', this.isDarkModeEnabled ? 'false' : 'true');

    gtag('event', 'toggle_dark_mode', {
      event_category: 'theming',
      dark_mode_enabled: this.isDarkModeEnabled,
    });

    this.loadDarkMode();
  }

  loadDarkMode() {
    gtag('set', {
      'user_properties.theme': this.isDarkModeEnabled ? 'dark' : 'light',
    });

    document.documentElement.classList.toggle('dark', this.isDarkModeEnabled);
  }
}
