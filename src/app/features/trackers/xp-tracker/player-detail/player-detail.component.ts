import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  RESPONSE_INIT,
  ResourceRef,
  Signal,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ActivityEnum, SkillEnum, parseHiscores } from '@osrs-tracker/hiscores';
import { HiscoreEntry, HiscoreSkill, Player } from '@osrs-tracker/models';
import { format } from 'date-fns';
import { EMPTY, catchError, finalize, map } from 'rxjs';
import { LoadErrorComponent } from 'src/app/common/components/general/load-error.component';
import { SegmentedComponent, SegmentedOption } from 'src/app/common/components/general/segmented.component';
import { SkeletonComponent } from 'src/app/common/components/general/skeleton.component';
import { StatTileComponent } from 'src/app/common/components/general/stat-tile.component';
import { StatusPanelComponent } from 'src/app/common/components/general/status-panel.component';
import { localIcons } from 'src/app/common/directives/icon/local-icons.generated';
import { LOCAL_ICONS } from 'src/app/common/directives/icon/local-icons.token';
import { formatNumberLegible } from 'src/app/common/helpers/number.helper';
import { CapitalizePipe } from 'src/app/common/pipes/capitalize.pipe';
import { TimeAgoPipe } from 'src/app/common/pipes/time-ago.pipe';
import { OsrsProxyRepo } from 'src/app/common/repositories/osrs-proxy.repo';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { isHumanVisitor } from 'src/app/core/platform/human-visitor';
import { resolverErrorHandler } from 'src/app/core/routing/resolver-error';
import { BOSSES, CLUES, MINIGAME_ROWS, RAID_LAYOUT, UNCHARTED_MINIGAMES } from '../activity-categories';
import { isTrackedFor } from '../player-tracking';
import { XpTrackerStore } from '../xp-tracker.store';
import { ActivityGridComponent } from './hiscores/activity-grid.component';
import { SkillGridComponent } from './hiscores/skill-grid.component';
import { PlayerChartComponent } from './player-chart.component';
import { isNotFound } from './player-detail.resolver';
import { PlayerHeaderComponent, TrackingState } from './player-header/player-header.component';
import { LogNotice, PlayerLogsComponent } from './player-logs/player-logs.component';
import { Gains, PeriodSummary, dailyGains, periodStart, periodSummary } from './player-summary';
import { BottomTab, PlayerView, TopTab } from './player-view';

interface StatTile {
  label: string;
  value: string;
  sub: string;
  tone: 'muted' | 'up' | 'down';
  tip?: string;
}

const ACTIVITIES = Object.values(ActivityEnum);

@Component({
  selector: 'player-detail',
  templateUrl: './player-detail.component.html',
  imports: [
    ActivityGridComponent,
    CapitalizePipe,
    DecimalPipe,
    LoadErrorComponent,
    PlayerChartComponent,
    PlayerHeaderComponent,
    PlayerLogsComponent,
    RouterLink,
    SegmentedComponent,
    SkeletonComponent,
    SkillGridComponent,
    StatTileComponent,
    StatusPanelComponent,
    TimeAgoPipe,
  ],
  providers: [
    PlayerView,
    // every skill and activity icon is shown here, so they come with this chunk instead of ~100 separate requests
    { provide: LOCAL_ICONS, useValue: localIcons },
  ],
})
export default class PlayerDetailComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly osrsProxyRepo = inject(OsrsProxyRepo);
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly xpTrackerStore = inject(XpTrackerStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly isHumanVisitor = isHumanVisitor();
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });
  readonly playerView = inject(PlayerView);

  readonly username: string = inject(ActivatedRoute).snapshot.params['username'];
  readonly #pageErrorHandler = resolverErrorHandler('/trackers/xp/' + this.username);

  /** 15 entries: the last week and the week before it, for the stat tiles. 30D and 60D load up to 61. */
  readonly #DEFAULT_SIZE = 15;
  readonly #MORE_SIZE = 7;
  /** The history is kept for about 60 days, so 60 days and today is all there is (and 30D's previous period fits) */
  readonly #PERIOD_SIZE = 61;
  /** Pages loaded after the first, with the size each asked for: a shorter page is the end of the history */
  readonly #morePages: WritableSignal<{ entries: HiscoreEntry[]; size: number }[]> = signal([]);

  /** `null` when there's no such player */
  readonly player = input.required<Player | null>();
  /** The resolved player, until `trackPlayer` returns a fresh one (or finds they no longer exist) */
  readonly playerDetail: WritableSignal<Player | null> = linkedSignal(() => this.player());

  readonly scrapingOffset: Signal<number> = this.xpTrackerStore.scrapingOffset;
  /** The UTC hour the visitor's offset is checked at, e.g. "02:00 UTC" */
  readonly trackedAt: Signal<string> = computed(
    () => `${String((this.scrapingOffset() + 24) % 24).padStart(2, '0')}:00 UTC`,
  );

  /** The live hiscores, only fetched in the browser. */
  readonly todayResource: ResourceRef<HiscoreEntry | undefined> = rxResource({
    // the resolved player, not playerDetail: trackPlayer replacing it mustn't restart the request
    params: () =>
      this.isBrowser && this.player() ? { username: this.username, offset: this.scrapingOffset() } : undefined,
    stream: ({ params: { username, offset } }) =>
      this.osrsProxyRepo.getPlayerHiscore(username, offset).pipe(map(hiscore => parseHiscores([hiscore])[0])),
  });
  readonly firstHistoryPage: ResourceRef<HiscoreEntry[] | undefined> = rxResource({
    params: () => (this.player() ? { username: this.username, offset: this.scrapingOffset() } : undefined),
    stream: ({ params: { username, offset } }) =>
      this.osrsTrackerRepo
        .getPlayerHiscores(username, offset, this.#DEFAULT_SIZE, 0)
        .pipe(map(scrapedHiscores => parseHiscores(scrapedHiscores))),
  });

  // value() throws while a resource is in its error state, so read it through hasValue()
  readonly today: Signal<HiscoreEntry | undefined> = computed(() =>
    this.todayResource.hasValue() ? this.todayResource.value() : undefined,
  );
  /** Also during SSR, which doesn't fetch them, so the page doesn't change on hydration */
  readonly todayLoading: Signal<boolean> = computed(
    () => !this.todayResource.hasValue() && !this.todayResource.error(),
  );
  readonly historyLoaded: Signal<boolean> = computed(() => this.firstHistoryPage.hasValue());
  readonly history: Signal<HiscoreEntry[]> = computed(() => [
    ...(this.firstHistoryPage.hasValue() ? (this.firstHistoryPage.value() ?? []) : []),
    ...this.#morePages().flatMap(page => page.entries),
  ]);
  readonly hasMoreEntries: Signal<boolean> = computed(() => {
    const lastMorePage = this.#morePages().at(-1);
    if (lastMorePage) return lastMorePage.entries.length === lastMorePage.size;
    return this.firstHistoryPage.hasValue() && this.firstHistoryPage.value()?.length === this.#DEFAULT_SIZE;
  });

  readonly loadingMore: WritableSignal<boolean> = signal(false);
  readonly loadMoreFailed: WritableSignal<boolean> = signal(false);

  /** The entries the period needs: its days and the period before them, as far as the history goes */
  readonly #periodSize: Signal<number> = computed(() => Math.min(this.playerView.period() * 2 + 1, this.#PERIOD_SIZE));
  /** The period's history is in (or there's no more, or it failed), so the chart and tiles are drawn once, complete */
  readonly periodLoaded: Signal<boolean> = computed(
    () =>
      this.historyLoaded() &&
      (this.history().length >= this.#periodSize() || !this.hasMoreEntries() || this.loadMoreFailed()),
  );

  /** The live hiscores; until they load (or when they fail) the newest tracked entry */
  readonly current: Signal<HiscoreEntry | undefined> = computed(() => this.today() ?? this.history()[0]);
  /** The stats shown are the last tracked ones because the hiscores didn't respond (to the API or the browser) */
  readonly stale: Signal<boolean> = computed(
    () =>
      !this.today() &&
      !!this.history().length &&
      (!!this.todayResource.error() || !!this.playerDetail()?.refreshFailed),
  );
  /** When the daily check last stored the player's stats (a failed check stores nothing): the newest entry's date */
  readonly lastCheckedAt: Signal<Date | undefined> = computed(() => this.history()[0]?.date);

  readonly trackingState: Signal<TrackingState> = computed(() => {
    const player = this.playerDetail();
    if (!player || !isTrackedFor(player, this.scrapingOffset())) return 'untracked';
    return this.historyLoaded() && this.history().length <= 1 ? 'started' : 'tracked';
  });

  /** Each day's gains, newest first; the first is today's so far when the live hiscores are in */
  readonly diffs: Signal<Gains[]> = computed(() => {
    const current = this.current();
    return current ? dailyGains(current, this.history()) : [];
  });
  /** The days the chart and tiles cover: the period's days and today so far, newest first */
  readonly periodDiffs: Signal<Gains[]> = computed(() => {
    const current = this.current();
    if (!current || !this.history().length) return [];
    return this.diffs().slice(0, periodStart(current, this.history(), this.playerView.period()).index + 1);
  });
  readonly chartState: Signal<'loading' | 'empty' | 'ready'> = computed(() => {
    if (!this.periodLoaded()) return 'loading';
    return this.history().length > 1 ? 'ready' : 'empty';
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
    const current = this.current();
    return current && periodSummary(current, this.history(), this.playerView.period());
  });

  /** Each skill's XP gained over the period, for the skills that gained any */
  readonly skillGains: Signal<ReadonlyMap<string, number>> = computed(() => {
    const gains = new Map<string, number>();
    this.periodDiffs().forEach(diff =>
      diff.skills.forEach(({ name, xp }) => {
        if (xp > 0) gains.set(name, (gains.get(name) ?? 0) + xp);
      }),
    );
    return gains;
  });
  /** Each activity's gains over the period */
  readonly activityGains: Signal<ReadonlyMap<string, number>> = computed(() => {
    const gains = new Map<string, number>();
    this.periodDiffs().forEach(diff =>
      diff.activities.forEach(({ name, score }) => {
        if (score > 0) gains.set(name, (gains.get(name) ?? 0) + score);
      }),
    );
    return gains;
  });
  /** The picked minigame, or the first running total with gains */
  readonly chartedMinigame: Signal<string | undefined> = computed(
    () =>
      this.playerView.minigame() ??
      MINIGAME_ROWS.flat().find(name => !(name in UNCHARTED_MINIGAMES) && this.activityGains().has(name)),
  );

  readonly topTabs: SegmentedOption<TopTab>[] = [
    { value: 'skills', label: 'Skills' },
    { value: 'bosses', label: 'Bosses' },
    { value: 'raids', label: 'Raids' },
  ];
  readonly bottomTabs: SegmentedOption<BottomTab>[] = [
    { value: 'clues', label: 'Clues' },
    { value: 'minigames', label: 'Minigames' },
  ];

  readonly bossLayout: (string | null)[] = fillRows(ACTIVITIES.filter(name => BOSSES.has(name)));
  readonly raidLayout: (string | null)[] = RAID_LAYOUT;
  readonly clueLayout: (string | null)[] = ACTIVITIES.filter(name => CLUES.has(name));
  /** Only the minigames the player is ranked in, each row of three filled up on its own */
  readonly minigameLayout: Signal<(string | null)[]> = computed(() => {
    const ranked = (name: string): boolean =>
      (this.current()?.activities.find(activity => activity.name === name)?.score ?? -1) > 0;
    return MINIGAME_ROWS.flatMap(row => fillRows(row.filter(ranked)));
  });
  /** One row of loading cells */
  readonly minigameSkeleton: (string | null)[] = MINIGAME_ROWS[0];
  readonly clueTotal: Signal<number | undefined> = computed(
    () => this.current()?.activities.find(activity => activity.name === ActivityEnum.ClueScrollsAll)?.score,
  );

  readonly overall: Signal<HiscoreSkill | undefined> = computed(() =>
    this.current()?.skills.find(skill => skill.name === SkillEnum.Overall),
  );
  readonly statTiles: Signal<StatTile[] | undefined> = computed(() => {
    const overall = this.overall();
    if (!overall || !this.periodLoaded()) return undefined;

    const totalLevel: StatTile = {
      label: 'Total level',
      value: overall.level.toLocaleString('en-US'),
      sub: overall.rank > 0 ? `Rank ${overall.rank.toLocaleString('en-US')}` : 'Unranked',
      tone: 'muted',
    };
    const summary = this.summary();
    const since = summary?.since;
    const xpLabel = since ? `XP since ${format(since, 'd MMM')}` : `XP last ${this.playerView.period()} days`;
    if (!summary) {
      return [
        totalLevel,
        { label: xpLabel, value: '–', sub: 'From the next check', tone: 'muted' },
        { label: 'Levels gained', value: '–', sub: '', tone: 'muted' },
        { label: 'Boss kills', value: '–', sub: '', tone: 'muted' },
      ];
    }

    const levelCount = summary.levels.reduce((total, { from, to }) => total + to - from, 0);
    const levels = summary.levels.map(({ skill, from, to }) => `${skill} ${from} → ${to}`).join(', ');
    return [
      totalLevel,
      {
        label: xpLabel,
        value: formatNumberLegible(summary.xp),
        tip: `${summary.xp.toLocaleString('en-US')} XP`,
        ...this.periodComparison(summary),
      },
      { label: 'Levels gained', value: String(levelCount), sub: levels, tip: levels, tone: 'muted' },
      {
        label: 'Boss kills',
        value: summary.bossKills.toLocaleString('en-US'),
        sub: summary.mostKilled ? `Most: ${summary.mostKilled.name} (${summary.mostKilled.kills})` : '',
        tone: 'muted',
      },
    ];
  });

  constructor() {
    // Only during SSR: the page is a 404 when there's no such player
    effect(() => {
      if (this.responseInit && !this.playerDetail()) this.responseInit.status = 404;
    });

    // A longer period loads the history it needs
    effect(() => {
      const needed = this.#periodSize();
      if (!this.historyLoaded() || this.history().length >= needed || !this.hasMoreEntries()) return;
      untracked(() => {
        if (!this.loadingMore()) this.loadMore(needed - this.history().length);
      });
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

  retryHiscores(): void {
    this.todayResource.reload();
    if (this.firstHistoryPage.error()) this.firstHistoryPage.reload();
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
          if (!wasTracked && isTrackedFor(player, offset)) this.firstHistoryPage.reload();
        },
        error: () => undefined, // already shown by #pageErrorHandler
      });
  }

  /** Loads the next `size` days of history, a week by default */
  loadMore(size: number = this.#MORE_SIZE): void {
    this.loadingMore.set(true);
    this.loadMoreFailed.set(false);

    this.osrsTrackerRepo
      .getPlayerHiscores(this.username, this.scrapingOffset(), size, this.history().length)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingMore.set(false)),
      )
      .subscribe({
        next: scrapedHiscores =>
          this.#morePages.update(pages => [...pages, { entries: parseHiscores(scrapedHiscores), size }]),
        error: () => this.loadMoreFailed.set(true),
      });
  }

  /** Compared with the period before it, e.g. "+24% vs previous week"; 60 days back is as far as the history goes */
  private periodComparison(summary: PeriodSummary): Pick<StatTile, 'sub' | 'tone'> {
    const { xp, previousXp } = summary;
    const previous = this.playerView.period() === 7 ? 'week' : `${this.playerView.period()} days`;
    if (previousXp === undefined) return { sub: '', tone: 'muted' };
    if (!previousXp)
      return { sub: xp ? `None the ${previous} before` : `None the ${previous} before either`, tone: 'muted' };

    const change = Math.round(((xp - previousXp) / previousXp) * 100);
    if (!change) return { sub: `Same as previous ${previous}`, tone: 'muted' };
    return {
      sub: `${change > 0 ? '+' : '−'}${Math.abs(change)}% vs previous ${previous}`,
      tone: change > 0 ? 'up' : 'down',
    };
  }
}

/** Empty cells (`null`) that complete the last row of three */
function fillRows(names: string[]): (string | null)[] {
  return [...names, ...Array<null>((3 - (names.length % 3)) % 3).fill(null)];
}
