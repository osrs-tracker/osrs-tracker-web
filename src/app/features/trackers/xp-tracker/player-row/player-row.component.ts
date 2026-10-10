import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  InputSignal,
  OnInit,
  PLATFORM_ID,
  ResourceRef,
  Signal,
  computed,
  inject,
  input,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { getOverallXpDiff } from '@osrs-tracker/hiscores';
import { HiscoreEntry, overallOf, Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { Observable, catchError, forkJoin, map, throwError } from 'rxjs';
import { LoadErrorComponent } from 'src/app/common/components/general/load-error.component';
import { SkeletonComponent } from 'src/app/common/components/general/skeleton.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { CapitalizePipe } from 'src/app/common/pipes/capitalize.pipe';
import { TimeAgoPipe } from 'src/app/common/pipes/time-ago.pipe';
import { OsrsProxyRepo } from 'src/app/common/repositories/osrs-proxy.repo';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { AnalyticsService } from 'src/app/common/services/analytics/analytics.service';
import { XpTrackerStore } from '../xp-tracker.store';

interface PlayerRowData {
  player: Player;
  /** XP gained since the player was last tracked, `null` when they haven't been tracked at this offset yet. */
  overallDiff: number | null;
  totalLevel: number | null;
}

const MODE_LABELS: Record<PlayerType | PlayerStatus, string> = {
  [PlayerType.Normal]: 'Regular',
  [PlayerType.Ironman]: 'Ironman',
  [PlayerType.Hardcore]: 'Hardcore ironman',
  [PlayerType.Ultimate]: 'Ultimate ironman',
  [PlayerStatus.Default]: 'Regular',
  [PlayerStatus.DeIroned]: 'Former ironman',
  [PlayerStatus.DeUltimated]: 'Former ultimate ironman',
};

/**
 * A 65px list row linking to a player: account type, name, total level and the XP gained since they were last tracked.
 * Known parts show straight away, the rest is a skeleton until the browser has fetched it.
 */
@Component({
  selector: 'a[player-row]',
  template: `
    @if (playerDetails(); as playerDetails) {
      <span
        class="relative flex items-center justify-center size-10 max-sm:size-8 shrink-0 rounded-xl bg-deep border border-line"
        [title]="modeTitle()"
      >
        @if (playerDetails.type === PlayerType.Normal) {
          <svg
            class="size-5.5 max-sm:size-4.5 stroke-text"
            viewBox="0 0 24 24"
            fill="none"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
          </svg>
        } @else {
          <img
            class="size-6 max-sm:size-5"
            icon
            [name]="playerDetails.status === PlayerStatus.Default ? playerDetails.type : playerDetails.status"
          />
        }
        @if (playerDetails.diedAsHardcore) {
          <img
            class="absolute -right-1.5 -bottom-1.5 size-5 p-0.5 rounded-full bg-deep border border-line"
            icon
            name="dead"
          />
        }
      </span>
    } @else {
      <skeleton class="size-10 max-sm:size-8 rounded-xl" />
    }

    <span class="flex flex-1 flex-col gap-1 min-w-0">
      <span class="truncate text-lg/5 max-sm:text-base/5 font-bold text-strong">{{
        _username() | capitalizeWords
      }}</span>
      @if (loading()) {
        <skeleton class="max-sm:hidden h-3 w-24 my-0.5" />
      } @else if (overallDiffResource.error()) {
        <span class="max-sm:hidden truncate text-sm/4 text-muted">Couldn't load this player.</span>
      } @else if (totalLevel() !== null) {
        <!-- Phones leave out the total level, so a row is one line -->
        <span class="max-sm:hidden truncate text-sm/4 text-muted">Total level {{ totalLevel() | number }}</span>
      }
    </span>

    @if (loading()) {
      <skeleton class="h-4 w-22" />
    } @else if (overallDiffResource.error()) {
      <load-error
        compact
        source="player-row"
        message="Couldn't load this player."
        (retry)="overallDiffResource.reload()"
      />
    } @else if (overallDiff() === null) {
      <span class="shrink-0 text-sm text-muted" title="This player hasn't been tracked at this offset yet.">
        Not tracked yet
      </span>
    } @else if (overallDiff() === 0) {
      <span class="shrink-0 text-sm text-muted" [title]="xpTitle()">No XP gained</span>
    } @else {
      <span class="shrink-0 font-bold text-strong tabular-nums" [title]="xpTitle()">
        +{{ overallDiff() | number }} XP
      </span>
    }
  `,
  host: {
    class:
      'flex items-center gap-3.5 max-sm:gap-3 px-5 max-sm:px-4 py-3 max-sm:py-2.5 border-b border-row bg-card hover:bg-row focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
  },
  imports: [CapitalizePipe, DecimalPipe, IconDirective, LoadErrorComponent, SkeletonComponent],
})
export class PlayerRowComponent implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly osrsProxyRepo = inject(OsrsProxyRepo);
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly xpTrackerStore = inject(XpTrackerStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly timeAgoPipe = new TimeAgoPipe();

  readonly PlayerType: typeof PlayerType = PlayerType;
  readonly PlayerStatus: typeof PlayerStatus = PlayerStatus;

  readonly username: InputSignal<string | null> = input<string | null>(null);
  readonly player: InputSignal<Player | null> = input<Player | null>(null);
  readonly scrapingOffset: InputSignal<number> = input.required();

  readonly _username: Signal<string> = computed(() => (this.player()?.username ?? this.username())!);

  /** The XP gained since the last scrape, and the player itself when only a username was given. Browser only. */
  readonly overallDiffResource: ResourceRef<PlayerRowData | undefined> = rxResource({
    params: () =>
      this.isBrowser ? { username: this.username(), player: this.player(), offset: this.scrapingOffset() } : undefined,
    stream: ({ params: { username, player, offset } }) =>
      player ? this.fetchFromPlayer(player, offset) : this.fetchFromUsername(username!, offset),
  });

  private readonly data: Signal<PlayerRowData | null> = computed(() =>
    this.overallDiffResource.hasValue() ? (this.overallDiffResource.value() ?? null) : null,
  );

  readonly playerDetails: Signal<Player | null> = computed(() => this.player() ?? this.data()?.player ?? null);
  readonly overallDiff: Signal<number | null> = computed(() => this.data()?.overallDiff ?? null);
  readonly totalLevel: Signal<number | null> = computed(() => this.data()?.totalLevel ?? null);
  // The server renders skeletons, the browser fetches
  readonly loading: Signal<boolean> = computed(() => !this.isBrowser || this.overallDiffResource.isLoading());

  readonly modeTitle: Signal<string> = computed(() => {
    const player = this.playerDetails();
    if (!player) return '';

    const label = MODE_LABELS[player.status === PlayerStatus.Default ? player.type : player.status];
    return player.diedAsHardcore ? `${label}, died. Now ranked on the regular ironman hiscores.` : label;
  });

  readonly xpTitle: Signal<string> = computed(() => {
    const lastTracked = this.playerDetails()?.hiscoreEntries?.[0]?.date;
    return `XP gained since ${this._username()} was last tracked, ${this.timeAgoPipe.transform(lastTracked)}.`;
  });

  ngOnInit(): void {
    if (this.player() === null && this.username() === null) {
      throw new Error('Either player or username must be provided');
    }
  }

  private fetchFromUsername(username: string, offset: number): Observable<PlayerRowData> {
    return forkJoin([
      this.osrsProxyRepo.getPlayerHiscore(username, offset),
      this.osrsTrackerRepo.getPlayerInfo(username, offset, { includeLatestHiscoreEntry: true, skipRefresh: true }),
    ]).pipe(
      map(([hiscore, player]) => this.toRowData(hiscore, player)),
      catchError(err => {
        // Only a player that no longer exists is removed, never one that failed to load for another reason
        if (err instanceof HttpErrorResponse && err.status === 404) this.removeMissingPlayer(username);
        return throwError(() => err);
      }),
    );
  }

  private fetchFromPlayer(player: Player, offset: number): Observable<PlayerRowData> {
    return this.osrsProxyRepo
      .getPlayerHiscore(player.username, offset)
      .pipe(map(hiscore => this.toRowData(hiscore, player)));
  }

  private toRowData(hiscore: HiscoreEntry, player: Player): PlayerRowData {
    return {
      player,
      overallDiff: player.hiscoreEntries?.length ? getOverallXpDiff(hiscore, player.hiscoreEntries[0]) : null,
      totalLevel: overallOf(hiscore).level,
    };
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
