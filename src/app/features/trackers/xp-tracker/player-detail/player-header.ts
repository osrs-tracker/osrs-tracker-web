import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, InputSignal, Signal } from '@angular/core';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { Icon } from '@app/common/icon/icon';
import { CapitalizePipe } from '@app/common/format/capitalize-pipe';
import { TimeAgoPipe } from '@app/common/format/time-ago-pipe';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { AccountTile } from '../account-tile';
import { XpTrackerStore } from '../xp-tracker-store';
import { Glyph } from '@app/common/ui/glyph/glyph';

/** Whether the player has a history at the visitor's offset yet, which decides the line under the name */
export type TrackingState = 'tracked' | 'started' | 'untracked';

/** The player's account type, name (to the official hiscores), combat level, history line and favourite star. */
@Component({
  selector: 'player-header',
  template: `
    @let player = playerDetail();

    <account-tile large [account]="player" />

    <div class="flex flex-col gap-1.5 grow basis-0 sm:basis-60 min-w-0">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <a
          class="flex items-center gap-2.5 min-w-0 text-strong hover:text-accent"
          target="_blank"
          rel="noopener"
          title="Open on the Old School Hiscores"
          [href]="hiscoreUrl()"
        >
          <h1 class="text-2xl sm:text-4xl leading-none font-bold">
            {{ player.username | capitalizeWords }}
          </h1>
          <svg glyph="external-link" class="size-4.5 shrink-0 text-muted" />
          <span class="sr-only">(opens the Old School Hiscores in a new tab)</span>
        </a>
        <!-- on phones the combat level wraps under the name, without the divider -->
        <span class="hidden sm:block self-center w-px h-5.5 bg-border" aria-hidden="true"></span>
        <span class="flex items-baseline gap-1.5 text-lg font-bold text-text tabular-nums" title="Combat level">
          <img class="size-3.75" icon name="combat" />{{ player.combatLevel }}
        </span>
      </div>
      <p class="text-base text-muted">
        @switch (trackingState()) {
          @case ('tracked') {
            <!-- trackedSince is unknown for a moment on another offset than the resolver's -->
            @if (player.trackedSince; as trackedSince) {
              History since {{ trackedSince | date: 'd MMM' }}
            } @else {
              Checked daily at {{ trackedAt() }}
            }
            @if (stale() && lastCheckedAt(); as lastCheckedAt) {
              · Last checked {{ lastCheckedAt | timeAgo }}
            }
          }
          @case ('started') {
            @if (player.trackedSince; as trackedSince) {
              Tracking started {{ trackedSince | timeAgo }} ·
            }
            Checked daily at {{ trackedAt() }}
          }
          @case ('untracked') {
            Not tracked at {{ trackedAt() }} yet
          }
        }
      </p>
    </div>

    <button
      type="button"
      class="flex items-center justify-center size-12 shrink-0 rounded-full border border-line bg-card hover:bg-row"
      [class]="isFavorite() ? 'text-amber' : 'text-muted'"
      [attr.aria-label]="isFavorite() ? 'Remove from favourites' : 'Add to favourites'"
      [attr.aria-pressed]="isFavorite()"
      [title]="isFavorite() ? 'Remove from favourites' : 'Add to favourites'"
      (click)="toggleFavorite()"
    >
      <svg glyph="star" class="size-5.5" [attr.fill]="isFavorite() ? 'currentColor' : 'none'" />
    </button>
  `,
  host: { class: 'flex flex-wrap items-center gap-4' },
  imports: [AccountTile, CapitalizePipe, DatePipe, Icon, TimeAgoPipe, Glyph],
})
export class PlayerHeader {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly xpTrackerStore = inject(XpTrackerStore);

  readonly playerDetail: InputSignal<Player> = input.required();
  readonly trackingState: InputSignal<TrackingState> = input.required();
  /** The UTC hour the visitor's offset is checked at, e.g. "02:00 UTC" */
  readonly trackedAt: InputSignal<string> = input.required();
  /** When the daily check last stored the player's stats; unknown while the history loads */
  readonly lastCheckedAt: InputSignal<Date | undefined> = input.required();
  /** The stats shown are the last stored ones, as the hiscores didn't respond: then the header says how old they are */
  readonly stale: InputSignal<boolean> = input(false);

  readonly isFavorite: Signal<boolean> = computed(() =>
    this.xpTrackerStore.isFavoritePlayer(this.playerDetail().username),
  );

  /** The account type's hiscores, where the player is ranked now */
  readonly hiscoreUrl: Signal<string> = computed(() => {
    const player = this.playerDetail();
    return `https://secure.runescape.com/m=hiscore_oldschool${this.hiscoreType(player)}/hiscorepersonal?user1=${encodeURIComponent(player.username)}`;
  });

  toggleFavorite(): void {
    this.xpTrackerStore.toggleFavoritePlayer(this.playerDetail().username);

    this.analyticsService.trackEvent('toggle_favorite_player', {
      username: this.playerDetail().username,
      favorite: this.isFavorite(),
    });
  }

  private hiscoreType(player: Player): string {
    if (player.status === PlayerStatus.DeUltimated) return '_' + PlayerType.Ironman;
    if (player.status === PlayerStatus.DeIroned || player.type === PlayerType.Normal) return '';
    if (player.type === PlayerType.Hardcore && player.diedAsHardcore) return '_' + PlayerType.Ironman;
    return '_' + player.type;
  }
}
