import { Component, WritableSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

/** Player name search that opens the player's page. Projected content (e.g. the tracking offset) goes below it. */
@Component({
  selector: 'player-search',
  host: { class: 'block w-full' },
  template: `
    <form autocomplete="off" class="relative">
      <input
        type="text"
        class="w-full input--default"
        placeholder="Enter player name"
        name="player"
        [(ngModel)]="usernameQuery"
        autocomplete="hidden"
      />
      <button
        type="submit"
        class="absolute right-0 button--primary rounded-xl"
        [routerLink]="usernameQuery() ? ['/trackers/xp', usernameQuery()] : '.'"
      >
        Search
      </button>

      <ng-content />
    </form>
  `,
  imports: [FormsModule, RouterLink],
})
export class PlayerSearchComponent {
  readonly usernameQuery: WritableSignal<string> = signal('');
}
