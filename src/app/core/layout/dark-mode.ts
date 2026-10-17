import { Component, inject } from '@angular/core';
import { ThemeStore } from '@app/common/theme/theme-store';
import { LucideMoon, LucideSun } from '@lucide/angular';

@Component({
  selector: 'dark-mode',
  host: { class: 'flex' },
  template: `
    <button
      type="button"
      class="flex items-center justify-center size-11 rounded-full border border-line text-strong hover:bg-row transition-colors"
      (click)="themeStore.toggleDarkMode()"
      aria-label="Dark mode"
      [attr.aria-pressed]="themeStore.darkMode()"
    >
      @if (!themeStore.darkMode()) {
        <svg lucideSun class="size-4.5" />
      } @else {
        <svg lucideMoon class="size-4.5" />
      }
    </button>
  `,
  imports: [LucideMoon, LucideSun],
})
export class DarkMode {
  readonly themeStore = inject(ThemeStore);
}
