import { Component, WritableSignal, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { Glyph } from '@app/common/ui/glyph/glyph';

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
        autocomplete="off"
      />
      <button
        type="submit"
        class="button--primary search-box-button"
        [routerLink]="usernameQuery() ? ['/trackers/xp', usernameQuery()] : '.'"
        (click)="trackSearch()"
      >
        <svg glyph="search" class="size-4.5" stroke-width="2.5" />
        <span class="max-sm:sr-only">Search</span>
      </button>
    </form>
  `,
  imports: [FormsModule, RouterLink, Glyph],
})
export class PlayerSearch {
  private readonly analyticsService = inject(AnalyticsService);

  readonly usernameQuery: WritableSignal<string> = signal('');

  /** The Search button, which Enter in the input clicks too */
  trackSearch(): void {
    if (this.usernameQuery().trim()) this.analyticsService.trackSearch('player', this.usernameQuery());
  }
}
