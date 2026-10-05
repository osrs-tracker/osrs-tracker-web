import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  booleanAttribute,
  InputSignal,
  InputSignalWithTransform,
  OnInit,
  PLATFORM_ID,
  ResourceRef,
  Signal,
  computed,
  inject,
  input,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { SkillEnum, getOverallXpDiff } from '@osrs-tracker/hiscores';
import { HiscoreEntry, Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { Observable, catchError, forkJoin, map, throwError } from 'rxjs';
import { LoadErrorComponent } from 'src/app/common/components/general/load-error.component';
import { SpinnerComponent } from 'src/app/common/components/general/spinner.component';
import { TooltipComponent } from 'src/app/common/components/general/tooltip/tooltip.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { CapitalizePipe } from 'src/app/common/pipes/capitalize.pipe';
import { TimeAgoPipe } from 'src/app/common/pipes/time-ago.pipe';
import { OsrsProxyRepo } from 'src/app/common/repositories/osrs-proxy.repo';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { AnalyticsService } from 'src/app/common/services/analytics/analytics.service';
import { XpTrackerStore } from '../xp-tracker.store';

@Component({
  selector: 'player-widget',
  template: `
    <article
      class="flex font-bold text-slate-900 dark:text-white cursor-pointer"
      [class]="
        flat()
          ? 'group items-center gap-4 min-h-13 py-3 text-base'
          : 'rounded text-lg bg-slate-200 dark:bg-slate-800 ring-2 ring-transparent hover:ring-emerald-600 dark:hover:ring-emerald-400'
      "
    >
      <div
        class="flex items-center gap-2"
        [class]="
          flat()
            ? 'min-w-0 flex-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
            : 'w-1/2 justify-between rounded-l bg-slate-350 dark:bg-slate-700 px-4 py-2'
        "
      >
        <h3 class="truncate" [title]="_username()">
          {{ _username() | capitalizeWords }}
        </h3>
        @if (playerDetails(); as playerDetails) {
          <div class="relative flex items-center rounded-full gap-2">
            @if (playerDetails.type !== PlayerType.Normal) {
              <img
                class="h-6 w-6"
                icon
                [name]="playerDetails.status === PlayerStatus.Default ? playerDetails.type : playerDetails.status"
              />
            }
            @if (playerDetails.diedAsHardcore) {
              <img class="h-6 w-6" icon name="dead" />
            }
          </div>
        }
      </div>
      <div class="flex justify-end" [class]="flat() ? 'shrink-0' : 'w-1/2 px-4 py-2'">
        <div class="flex items-center">
          @if (loading()) {
            <spinner />
          } @else if (overallDiffResource.error()) {
            <load-error
              compact
              source="player-widget"
              message="Couldn't load this player."
              (retry)="overallDiffResource.reload()"
            />
          } @else {
            @if (overallDiff() === null) {
              &mdash;
            } @else {
              <div [tooltip]="!!player()" [tooltipTemplate]="tooltip">+&nbsp;{{ overallDiff() | number }}&nbsp;XP</div>
              <ng-template #tooltip>
                The XP for this player is calculated since they were last scraped, which is
                {{ player()?.hiscoreEntries?.[0]?.date | timeAgo }}.
              </ng-template>

              <img class="w-5 h-5 ml-2 mb-1" icon [name]="SkillEnum.Overall" [skill]="true" />
            }
          }
        </div>
      </div>
    </article>
  `,
  imports: [
    CapitalizePipe,
    DecimalPipe,
    TimeAgoPipe,
    IconDirective,
    LoadErrorComponent,
    SpinnerComponent,
    TooltipComponent,
  ],
})
export class PlayerWidgetComponent implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly osrsProxyRepo = inject(OsrsProxyRepo);
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly xpTrackerStore = inject(XpTrackerStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly PlayerType: typeof PlayerType = PlayerType;
  readonly PlayerStatus: typeof PlayerStatus = PlayerStatus;
  readonly SkillEnum: typeof SkillEnum = SkillEnum;

  readonly username: InputSignal<string | null> = input<string | null>(null);
  readonly player: InputSignal<Player | null> = input<Player | null>(null);
  readonly scrapingOffset: InputSignal<number> = input.required();
  /** A borderless row for lists inside a card, instead of a standalone widget. */
  readonly flat: InputSignalWithTransform<boolean, unknown> = input(false, { transform: booleanAttribute });

  readonly _username: Signal<string> = computed(() => (this.player()?.username ?? this.username())!);

  /** The XP gained since the last scrape, and the player itself when only a username was given. Browser only. */
  readonly overallDiffResource: ResourceRef<{ player: Player; overallDiff: number | null } | undefined> = rxResource({
    params: () =>
      this.isBrowser ? { username: this.username(), player: this.player(), offset: this.scrapingOffset() } : undefined,
    stream: ({ params: { username, player, offset } }) =>
      player ? this.fetchFromPlayer(player, offset) : this.fetchFromUsername(username!, offset),
  });

  readonly playerDetails: Signal<Player | null> = computed(
    () =>
      this.player() ??
      (this.overallDiffResource.hasValue() ? (this.overallDiffResource.value()?.player ?? null) : null),
  );
  readonly overallDiff: Signal<number | null> = computed(() =>
    this.overallDiffResource.hasValue() ? (this.overallDiffResource.value()?.overallDiff ?? null) : null,
  );
  // The server renders a spinner, the browser fetches
  readonly loading: Signal<boolean> = computed(() => !this.isBrowser || this.overallDiffResource.isLoading());

  ngOnInit(): void {
    if (this.player() === null && this.username() === null) {
      throw new Error('Either player or username must be provided');
    }
  }

  private fetchFromUsername(
    username: string,
    offset: number,
  ): Observable<{ player: Player; overallDiff: number | null }> {
    return forkJoin([
      this.osrsProxyRepo.getPlayerHiscore(username, offset),
      this.osrsTrackerRepo.getPlayerInfo(username, offset, { includeLatestHiscoreEntry: true, skipRefresh: true }),
    ]).pipe(
      map(([hiscore, player]) => ({ player, overallDiff: this.overallXpDiff(hiscore, player) })),
      catchError(err => {
        // Only a player that no longer exists is removed, never one that failed to load for another reason
        if (err instanceof HttpErrorResponse && err.status === 404) this.removeMissingPlayer(username);
        return throwError(() => err);
      }),
    );
  }

  private fetchFromPlayer(player: Player, offset: number): Observable<{ player: Player; overallDiff: number | null }> {
    return this.osrsProxyRepo
      .getPlayerHiscore(player.username, offset)
      .pipe(map(hiscore => ({ player, overallDiff: this.overallXpDiff(hiscore, player) })));
  }

  private overallXpDiff(hiscore: HiscoreEntry, player: Player): number | null {
    return player.hiscoreEntries?.length ? getOverallXpDiff(hiscore, player.hiscoreEntries[0]) : null;
  }

  private removeMissingPlayer(username: string): void {
    if (this.xpTrackerStore.recentPlayers().includes(username)) {
      this.xpTrackerStore.removeRecentPlayer(username);
    }

    if (this.xpTrackerStore.favoritePlayers().includes(username)) {
      this.xpTrackerStore.toggleFavoritePlayer(username);
    }

    this.analyticsService.trackEvent('remove-missing-player', 'xp-tracker', username, true);
  }
}
