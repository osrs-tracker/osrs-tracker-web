import { Component, WritableSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

/** Player name search that opens the player's page; `[leading]` content (e.g. a mode switch) goes before the input. */
@Component({
  selector: 'player-search',
  host: { class: 'block w-full' },
  template: `
    <form autocomplete="off" class="search-box">
      <ng-content select="[leading]" />
      <label for="player-search" class="sr-only">Player name</label>
      <input
        id="player-search"
        type="search"
        class="search-box-input"
        placeholder="Player name, e.g. Zezima"
        name="player"
        [(ngModel)]="usernameQuery"
        autocomplete="hidden"
      />
      <button
        type="submit"
        class="button--primary search-box-button"
        [routerLink]="usernameQuery() ? ['/trackers/xp', usernameQuery()] : '.'"
      >
        <svg
          class="size-4.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span class="max-sm:sr-only">Search</span>
      </button>
    </form>
  `,
  imports: [FormsModule, RouterLink],
})
export class PlayerSearchComponent {
  readonly usernameQuery: WritableSignal<string> = signal('');
}
