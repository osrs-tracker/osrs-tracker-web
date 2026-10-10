import { Component, inject } from '@angular/core';
import { ThemeService } from '@app/common/services/theme-service';

@Component({
  selector: 'dark-mode',
  host: { class: 'flex' },
  template: `
    <button
      type="button"
      class="flex items-center justify-center size-11 rounded-full border border-line text-strong hover:bg-row transition-colors"
      (click)="themeService.toggleDarkMode()"
      aria-label="Dark mode"
      [attr.aria-pressed]="themeService.darkMode()"
    >
      @if (!themeService.darkMode()) {
        <svg
          class="size-4.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
          />
        </svg>
      } @else {
        <svg
          class="size-4.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      }
    </button>
  `,
})
export class DarkMode {
  readonly themeService = inject(ThemeService);
}
