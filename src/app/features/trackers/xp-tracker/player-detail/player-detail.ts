import { isPlatformBrowser, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DOCUMENT,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  RESPONSE_INIT,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { overallOf, Player } from '@osrs-tracker/models';
import { EMPTY, catchError } from 'rxjs';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { StatTile } from '@app/common/ui/cards/stat-tile';
import { StatusPanel } from '@app/common/ui/page/status-panel';
import { localIcons } from '@app/common/icon/local-icons.generated';
import { LOCAL_ICONS } from '@app/common/icon/local-icons-token';
import { CapitalizePipe } from '@app/common/format/capitalize-pipe';
import { capitalise } from '@app/common/format/player-labels';
import { TimeAgoPipe } from '@app/common/format/time-ago-pipe';
import { OsrsProxyRepo } from '@app/common/api/osrs-proxy-repo';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { isHumanVisitor } from '@app/core/platform/human-visitor';
import { isNotFound, resolverErrorHandler } from '@app/core/routing/resolver-error';
import { MINIGAME_ROWS, UNCHARTED_MINIGAMES } from './activity-categories';
import { XpTrackerStore } from '../xp-tracker-store';
import { ActivitiesCard } from './hiscores/activities-card';
import { ModeRanks } from './hiscores/mode-ranks';
import { SkillsCard } from './hiscores/skills-card';
import { PlayerChart } from './charts/player-chart';
import { CompareDays } from './compare/compare-days';
import { DAY_PARAM, readComparePicks, writeComparePicks } from './compare/compare-url';
import { PlayerHeader } from './player-header';
import { playerHistory } from './player-history';
import { LogNotice, PlayerLogs } from './player-logs';
import { statTilesFor } from './stat-tiles';
import { dailyGains, periodStart, periodSummary, totalGains } from './player-summary';
import { PlayerView } from './player-view';
import { Glyph } from '@app/common/ui/glyph/glyph';

type LogView = 'days' | 'compare';

const LOG_VIEWS: SegmentedOption<LogView>[] = [
  { value: 'days', label: 'Days' },
  { value: 'compare', label: 'Compare' },
];

@Component({
  selector: 'player-detail',
  templateUrl: './player-detail.html',
  imports: [
    ActivitiesCard,
    CapitalizePipe,
    CompareDays,
    LoadError,
    PlayerChart,
    PlayerHeader,
    PlayerLogs,
    RouterLink,
    Segmented,
    SkillsCard,
    StatTile,
    StatusPanel,
    TimeAgoPipe,
    Glyph,
  ],
  providers: [
    PlayerView,
    ModeRanks,
    // every skill and activity icon is shown here, so they come with this chunk instead of ~100 separate requests
    { provide: LOCAL_ICONS, useValue: localIcons },
  ],
})
export default class PlayerDetail implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly osrsProxyRepo = inject(OsrsProxyRepo);
  private readonly document = inject(DOCUMENT);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly xpTrackerStore = inject(XpTrackerStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly isHumanVisitor = isHumanVisitor();
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });
  readonly playerView = inject(PlayerView);

  private readonly route = inject(ActivatedRoute);
  readonly username: string = this.route.snapshot.params['username'];
  private readonly location = inject(Location);

  readonly logViews: SegmentedOption<LogView>[] = LOG_VIEWS;
  /** The day log, or two days compared in its place; a shared link with picked days opens the comparison */
  readonly logView = signal<LogView>(this.route.snapshot.queryParamMap.has(DAY_PARAM) ? 'compare' : 'days');
  /** Once opened, the comparison stays (hidden on Days), so going back to it keeps the picks and loads nothing again */
  readonly compareOpened = signal(this.logView() === 'compare');
  /** Compare is shown in the day log's place; a new player's single day has nothing to compare */
  readonly comparing = computed(() => this.logView() === 'compare' && this.history.entries().length > 1);
  readonly #pageErrorHandler = resolverErrorHandler('/trackers/xp/' + this.username);

  /** `null` when there's no such player */
  readonly player = input.required<Player | null>();
  /** The resolved player, until `trackPlayer` returns a fresh one (or finds they no longer exist) */
  readonly playerDetail = linkedSignal(() => this.player());

  readonly scrapingOffset = this.xpTrackerStore.scrapingOffset;
  /** The UTC hour the visitor's offset is checked at, e.g. "02:00 UTC" */
  readonly trackedAt = computed(() => `${String((this.scrapingOffset() + 24) % 24).padStart(2, '0')}:00 UTC`);

  readonly history = playerHistory({
    username: this.username,
    offset: this.scrapingOffset,
    // the resolved player, not playerDetail: trackPlayer replacing it mustn't restart the requests
    enabled: computed(() => !!this.player()),
    period: this.playerView.period,
  });

  /** The stats shown are the last tracked ones because the hiscores didn't respond (to the API or the browser) */
  readonly stale = computed(
    () =>
      !this.history.today() &&
      !!this.history.entries().length &&
      (this.history.todayFailed() || !!this.playerDetail()?.refreshFailed),
  );
  /** Without live hiscores the newest tracked entry stands in, so this only fails when there's none either */
  readonly hiscoresFailed = computed(
    () =>
      !this.history.current() &&
      this.history.todayFailed() &&
      (this.history.loaded() || this.history.firstPageFailed()),
  );

  readonly trackingState = computed(() => {
    const player = this.playerDetail();
    if (!player || !isTrackedFor(player, this.scrapingOffset())) return 'untracked';
    return this.history.loaded() && this.history.entries().length <= 1 ? 'started' : 'tracked';
  });

  /** Each day's gains, newest first; the first is today's so far when the live hiscores are in */
  readonly diffs = computed(() => {
    const current = this.history.current();
    return current ? dailyGains(current, this.history.entries()) : [];
  });
  /** The days the chart and tiles cover: the period's days and today so far, newest first */
  readonly periodDiffs = computed(() => {
    const current = this.history.current();
    const entries = this.history.entries();
    if (!current || !entries.length) return [];
    return this.diffs().slice(0, periodStart(current, entries, this.playerView.period()).index + 1);
  });
  readonly chartState = computed(() => {
    if (!this.history.periodLoaded()) return 'loading';
    return this.history.entries().length > 1 ? 'ready' : 'empty';
  });

  readonly emptyChartText = computed(() => {
    const name = capitalise(this.username);
    return this.trackingState() === 'untracked'
      ? `${name} isn’t tracked at ${this.trackedAt()} yet. Once they’re looked up, this chart shows what they gain each day.`
      : `${name}’s stats were saved. After the next check at ${this.trackedAt()}, this chart shows what they gain each day.`;
  });

  readonly logNotice = computed<LogNotice | undefined>(() => {
    switch (this.trackingState()) {
      case 'started':
        return {
          // the one entry is the start, until the lookup returns trackedSince for another offset than the resolver's
          date: new Date(this.playerDetail()?.trackedSince ?? this.history.entries()[0]?.date ?? Date.now()),
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

  readonly summary = computed(() => {
    const current = this.history.current();
    return current && periodSummary(current, this.history.comparedEntries(), this.playerView.period());
  });

  /** Each skill's XP gained over the period, for the skills that gained any */
  readonly skillGains = computed(() => totalGains(this.periodDiffs(), 'skills'));
  /** Each activity's gains over the period */
  readonly activityGains = computed(() => totalGains(this.periodDiffs(), 'activities'));
  /** The picked minigame, or the first running total with gains */
  readonly chartedMinigame = computed(
    () =>
      this.playerView.minigame() ??
      MINIGAME_ROWS.flat().find(name => !(name in UNCHARTED_MINIGAMES) && this.activityGains().has(name)),
  );

  readonly overall = computed(() => {
    const current = this.history.current();
    return current && overallOf(current);
  });
  readonly statTiles = computed(() => {
    const overall = this.overall();
    if (!overall || !this.history.comparedLoaded()) return undefined;
    return statTilesFor(overall, this.summary(), this.playerView.period(), this.history.previousPeriodFailed());
  });

  constructor() {
    inject(ModeRanks).connect({ username: this.username, player: this.playerDetail, hiscore: this.history.current });

    // Only during SSR: the page is a 404 when there's no such player
    effect(() => {
      if (this.responseInit && !this.playerDetail()) this.responseInit.status = 404;
    });

    // Only in the browser, where AnalyticsService sends: also when tracking finds the player no longer exists
    effect(() => {
      if (!this.playerDetail()) {
        this.analyticsService.trackEvent('player_not_found', { username: this.username.toLowerCase() });
      }
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
    else this.preloadLiveHiscores();
    if (this.isHumanVisitor) this.trackPlayer();
  }

  search(username: string): void {
    this.analyticsService.trackSearch('player', username);
    void this.router.navigate(['/trackers/xp', username]);
  }

  loadMoreDays(): void {
    this.history.loadMore();
    this.analyticsService.trackEvent('load_more_days');
  }

  /** Days or Compare; back to Days takes the picked days out of the URL, so a reload or a copied link shows the days */
  setLogView(view: LogView): void {
    this.logView.set(view);
    this.analyticsService.trackOption('log_view', view);
    if (view === 'compare') this.compareOpened.set(true);
    if (view === 'days' && readComparePicks(this.router, this.location).day !== undefined) {
      writeComparePicks(this.router, this.route, this.location, null);
    }
  }

  /** The stale hiscores notice's Try again */
  reloadToday(): void {
    this.history.reloadToday();
    this.analyticsService.trackEvent('retry', { source: 'player-stale' });
  }

  /**
   * During SSR: the browser starts the live hiscores request while it reads the page, instead of once the app has loaded,
   * and the app's request then gets that response. The server itself still never calls Jagex (`docs/decisions.md`).
   */
  private preloadLiveHiscores(): void {
    const link = this.document.createElement('link');
    link.setAttribute('rel', 'preload');
    link.setAttribute('as', 'fetch');
    // like the app's request (no credentials), or the browser doesn't use it and fetches again
    link.setAttribute('crossorigin', '');
    link.setAttribute('href', this.osrsProxyRepo.hiscoreTableUrl(this.username, 'hiscore_oldschool'));
    this.document.head.appendChild(link);
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
