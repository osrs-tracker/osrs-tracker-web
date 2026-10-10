import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  RESPONSE_INIT,
  Signal,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HiscoreSkill, overallOf, Player } from '@osrs-tracker/models';
import { EMPTY, catchError } from 'rxjs';
import { LoadError } from '@app/common/ui/loading/load-error';
import { StatTile } from '@app/common/ui/cards/stat-tile';
import { StatusPanel } from '@app/common/ui/page/status-panel';
import { localIcons } from '@app/common/icon/local-icons.generated';
import { LOCAL_ICONS } from '@app/common/icon/local-icons-token';
import { CapitalizePipe } from '@app/common/format/capitalize-pipe';
import { TimeAgoPipe } from '@app/common/format/time-ago-pipe';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { isHumanVisitor } from '@app/core/platform/human-visitor';
import { resolverErrorHandler } from '@app/core/routing/resolver-error';
import { MINIGAME_ROWS, UNCHARTED_MINIGAMES } from './activity-categories';
import { XpTrackerStore } from '../xp-tracker-store';
import { ActivitiesCard } from './hiscores/activities-card';
import { SkillsCard } from './hiscores/skills-card';
import { PlayerChart } from './charts/player-chart';
import { isNotFound } from './player-detail-resolver';
import { PlayerHeader, TrackingState } from './player-header';
import { playerHistory, PlayerHistory } from './player-history';
import { LogNotice, PlayerLogs } from './player-logs';
import { StatTileView, statTilesFor } from './stat-tiles';
import { Gains, PeriodSummary, dailyGains, periodStart, periodSummary, totalGains } from './player-summary';
import { PlayerView } from './player-view';

@Component({
  selector: 'player-detail',
  templateUrl: './player-detail.html',
  imports: [
    ActivitiesCard,
    CapitalizePipe,
    LoadError,
    PlayerChart,
    PlayerHeader,
    PlayerLogs,
    RouterLink,
    SkillsCard,
    StatTile,
    StatusPanel,
    TimeAgoPipe,
  ],
  providers: [
    PlayerView,
    // every skill and activity icon is shown here, so they come with this chunk instead of ~100 separate requests
    { provide: LOCAL_ICONS, useValue: localIcons },
  ],
})
export default class PlayerDetail implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly xpTrackerStore = inject(XpTrackerStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly isHumanVisitor = isHumanVisitor();
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });
  readonly playerView = inject(PlayerView);

  readonly username: string = inject(ActivatedRoute).snapshot.params['username'];
  readonly #pageErrorHandler = resolverErrorHandler('/trackers/xp/' + this.username);

  /** `null` when there's no such player */
  readonly player = input.required<Player | null>();
  /** The resolved player, until `trackPlayer` returns a fresh one (or finds they no longer exist) */
  readonly playerDetail: WritableSignal<Player | null> = linkedSignal(() => this.player());

  readonly scrapingOffset: Signal<number> = this.xpTrackerStore.scrapingOffset;
  /** The UTC hour the visitor's offset is checked at, e.g. "02:00 UTC" */
  readonly trackedAt: Signal<string> = computed(
    () => `${String((this.scrapingOffset() + 24) % 24).padStart(2, '0')}:00 UTC`,
  );

  readonly history: PlayerHistory = playerHistory({
    username: this.username,
    offset: this.scrapingOffset,
    // the resolved player, not playerDetail: trackPlayer replacing it mustn't restart the requests
    enabled: computed(() => !!this.player()),
    period: this.playerView.period,
  });

  /** The stats shown are the last tracked ones because the hiscores didn't respond (to the API or the browser) */
  readonly stale: Signal<boolean> = computed(
    () =>
      !this.history.today() &&
      !!this.history.entries().length &&
      (this.history.todayFailed() || !!this.playerDetail()?.refreshFailed),
  );
  /** Without live hiscores the newest tracked entry stands in, so this only fails when there's none either */
  readonly hiscoresFailed: Signal<boolean> = computed(
    () =>
      !this.history.current() &&
      this.history.todayFailed() &&
      (this.history.loaded() || this.history.firstPageFailed()),
  );

  readonly trackingState: Signal<TrackingState> = computed(() => {
    const player = this.playerDetail();
    if (!player || !isTrackedFor(player, this.scrapingOffset())) return 'untracked';
    return this.history.loaded() && this.history.entries().length <= 1 ? 'started' : 'tracked';
  });

  /** Each day's gains, newest first; the first is today's so far when the live hiscores are in */
  readonly diffs: Signal<Gains[]> = computed(() => {
    const current = this.history.current();
    return current ? dailyGains(current, this.history.entries()) : [];
  });
  /** The days the chart and tiles cover: the period's days and today so far, newest first */
  readonly periodDiffs: Signal<Gains[]> = computed(() => {
    const current = this.history.current();
    const entries = this.history.entries();
    if (!current || !entries.length) return [];
    return this.diffs().slice(0, periodStart(current, entries, this.playerView.period()).index + 1);
  });
  readonly chartState: Signal<'loading' | 'empty' | 'ready'> = computed(() => {
    if (!this.history.periodLoaded()) return 'loading';
    return this.history.entries().length > 1 ? 'ready' : 'empty';
  });

  readonly emptyChartText: Signal<string> = computed(() => {
    const name = CapitalizePipe.capitalise(this.username);
    return this.trackingState() === 'untracked'
      ? `${name} isn’t tracked at ${this.trackedAt()} yet. Once they’re looked up, this chart shows what they gain each day.`
      : `${name}’s stats were saved. After the next check at ${this.trackedAt()}, this chart shows what they gain each day.`;
  });

  readonly logNotice: Signal<LogNotice | undefined> = computed(() => {
    switch (this.trackingState()) {
      case 'started':
        return {
          date: new Date(this.playerDetail()?.trackedSince ?? Date.now()),
          label: 'Tracking started',
          text: 'First entry saved. Each daily check adds a day here.',
        };
      case 'untracked':
        return {
          date: new Date(),
          label: 'Not tracked yet',
          text: `Each daily check at ${this.trackedAt()} adds a day here once they're looked up.`,
        };
      default:
        return undefined;
    }
  });

  readonly summary: Signal<PeriodSummary | undefined> = computed(() => {
    const current = this.history.current();
    return current && periodSummary(current, this.history.comparedEntries(), this.playerView.period());
  });

  /** Each skill's XP gained over the period, for the skills that gained any */
  readonly skillGains: Signal<ReadonlyMap<string, number>> = computed(() => totalGains(this.periodDiffs(), 'skills'));
  /** Each activity's gains over the period */
  readonly activityGains: Signal<ReadonlyMap<string, number>> = computed(() =>
    totalGains(this.periodDiffs(), 'activities'),
  );
  /** The picked minigame, or the first running total with gains */
  readonly chartedMinigame: Signal<string | undefined> = computed(
    () =>
      this.playerView.minigame() ??
      MINIGAME_ROWS.flat().find(name => !(name in UNCHARTED_MINIGAMES) && this.activityGains().has(name)),
  );

  readonly overall: Signal<HiscoreSkill | undefined> = computed(() => {
    const current = this.history.current();
    return current && overallOf(current);
  });
  readonly statTiles: Signal<StatTileView[] | undefined> = computed(() => {
    const overall = this.overall();
    if (!overall || !this.history.periodLoaded()) return undefined;
    return statTilesFor(overall, this.summary(), this.playerView.period(), this.history.previousPeriodFailed());
  });

  constructor() {
    // Only during SSR: the page is a 404 when there's no such player
    effect(() => {
      if (this.responseInit && !this.playerDetail()) this.responseInit.status = 404;
    });

    // Only skills with gains can be picked, so a shorter period drops the picks that gained nothing in it
    effect(() => {
      const gains = this.skillGains();
      untracked(() => this.playerView.keepSkills(gains));
    });
  }

  ngOnInit(): void {
    if (!this.player()) return;
    if (this.isBrowser) this.xpTrackerStore.pushRecentPlayer(this.player()!.username);
    if (this.isHumanVisitor) this.trackPlayer();
  }

  search(username: string): void {
    void this.router.navigate(['/trackers/xp', username]);
  }

  /** Starts tracking the player (or refreshes them when stale) and shows the player it returns. */
  private trackPlayer(): void {
    const offset = this.scrapingOffset();

    this.osrsTrackerRepo
      .trackPlayer(this.username, offset)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err: unknown) => {
          // like the GET: not found shows the not-found state, the hiscores being down the error page (the handler
          // rethrows); after any other failure the page still shows the player it resolved
          if (isNotFound(err)) this.playerDetail.set(null);
          else if (err instanceof HttpErrorResponse && err.status === 503) return this.#pageErrorHandler(err);
          return EMPTY;
        }),
      )
      .subscribe({
        next: player => {
          if (!player) return; // the API took us for a bot and recorded nothing
          const wasTracked = isTrackedFor(this.playerDetail()!, offset);
          this.playerDetail.set(player);
          // tracking an offset stores its first entry, so load it
          if (!wasTracked && isTrackedFor(player, offset)) this.history.reloadFirstPage();
        },
        error: () => undefined, // already shown by #pageErrorHandler
      });
  }
}

/**
 * Whether the player has a history for `scrapingOffset`: tracked there, or paused (still has the history). An untracked
 * player, such as a preview of one that isn't stored, has neither.
 */
function isTrackedFor(player: Player, scrapingOffset: number): boolean {
  return !!(player.scrapingOffsets?.includes(scrapingOffset) || player.pausedScrapingOffsets?.includes(scrapingOffset));
}
