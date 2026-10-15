import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, PLATFORM_ID, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { getOverallXpDiff } from '@osrs-tracker/hiscores';
import { HiscoreEntry, overallOf, Player } from '@osrs-tracker/models';
import { Observable, catchError, forkJoin, map, throwError } from 'rxjs';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { CapitalizePipe } from '@app/common/format/capitalize-pipe';
import { TimeAgoPipe } from '@app/common/format/time-ago-pipe';
import { OsrsProxyRepo } from '@app/common/api/osrs-proxy-repo';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { AccountTile } from './account-tile';
import { XpTrackerStore } from './xp-tracker-store';

interface PlayerRowData {
  player: Player;
  /** XP gained since the player was last tracked, `null` when they haven't been tracked at this offset yet. */
  overallDiff: number | null;
  totalLevel: number | null;
}

/**
 * A 65px list row linking to a player: account type, name, total level and the XP gained since they were last tracked.
 * Known parts show straight away, the rest is a skeleton until the browser has fetched it.
 */
@Component({
  selector: 'a[player-row]',
  template: `
    @if (playerDetails(); as playerDetails) {
      <account-tile [account]="playerDetails" />
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
  imports: [AccountTile, CapitalizePipe, DecimalPipe, LoadError, Skeleton],
})
export class PlayerRow implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly osrsProxyRepo = inject(OsrsProxyRepo);
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly xpTrackerStore = inject(XpTrackerStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly timeAgoPipe = new TimeAgoPipe();

  readonly username = input<string | null>(null);
  readonly player = input<Player | null>(null);
  readonly scrapingOffset = input.required<number>();

  readonly _username = computed(() => (this.player()?.username ?? this.username())!);

  /** The XP gained since the last scrape, and the player itself when only a username was given. Browser only. */
  readonly overallDiffResource = rxResource({
    params: () =>
      this.isBrowser ? { username: this.username(), player: this.player(), offset: this.scrapingOffset() } : undefined,
    stream: ({ params: { username, player, offset } }) =>
      player ? this.fetchFromPlayer(player, offset) : this.fetchFromUsername(username!, offset),
  });

  private readonly data = computed(() =>
    this.overallDiffResource.hasValue() ? (this.overallDiffResource.value() ?? null) : null,
  );

  readonly playerDetails = computed(() => this.player() ?? this.data()?.player ?? null);
  readonly overallDiff = computed(() => this.data()?.overallDiff ?? null);
  readonly totalLevel = computed(() => this.data()?.totalLevel ?? null);
  // The server renders skeletons, the browser fetches
  readonly loading = computed(() => !this.isBrowser || this.overallDiffResource.isLoading());

  readonly xpTitle = computed(() => {
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

    this.analyticsService.trackEvent('remove_missing_player', { username });
  }
}
