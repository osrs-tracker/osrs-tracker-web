import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DarkModeService {
  get isDarkModeEnabled(): boolean {
    return localStorage.getItem('darkMode') === 'true';
  }

  toggleDarkMode() {
    localStorage.setItem('darkMode', this.isDarkModeEnabled ? 'false' : 'true');

    this.loadDarkMode();
  }

  loadDarkMode() {
    document.documentElement.classList.toggle('dark', this.isDarkModeEnabled);
  }
}
