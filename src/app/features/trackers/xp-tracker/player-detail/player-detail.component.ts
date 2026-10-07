import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  ResourceRef,
  Signal,
  WritableSignal,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { parseHiscores } from '@osrs-tracker/hiscores';
import { HiscoreEntry, Player } from '@osrs-tracker/models';
import { EMPTY, catchError, finalize, map } from 'rxjs';
import { isHumanVisitor } from 'src/app/core/platform/human-visitor';
import { resolverErrorHandler } from 'src/app/core/routing/resolver-error';
import { LoadErrorComponent } from 'src/app/common/components/general/load-error.component';
import { SpinnerComponent } from 'src/app/common/components/general/spinner.component';
import { PlayerBossesWidgetComponent } from './hiscores/player-bosses.component';
import { PlayerCluesWidgetComponent } from './hiscores/player-clues.component';
import { PlayerRaidsWidgetComponent } from './hiscores/player-raids.component';
import { PlayerSkillsWidgetComponent } from './hiscores/player-skills.component';
import { localIcons } from 'src/app/common/directives/icon/local-icons.generated';
import { LOCAL_ICONS } from 'src/app/common/directives/icon/local-icons.token';
import { OsrsProxyRepo } from 'src/app/common/repositories/osrs-proxy.repo';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { isTrackedFor } from '../player-tracking';
import { XpTrackerStore } from '../xp-tracker.store';
import { PlayerDetailWidgetComponent } from './player-detail-widget/player-detail-widget.component';
import { PlayerLogsComponent } from './player-logs/player-logs.component';

@Component({
  selector: 'player-detail',
  templateUrl: './player-detail.component.html',
  imports: [
    PlayerSkillsWidgetComponent,
    PlayerCluesWidgetComponent,
    PlayerRaidsWidgetComponent,
    PlayerBossesWidgetComponent,
    PlayerDetailWidgetComponent,
    PlayerLogsComponent,
    LoadErrorComponent,
    SpinnerComponent,
  ],
  // every skill and activity icon is shown here, so they come with this chunk instead of ~100 separate requests
  providers: [{ provide: LOCAL_ICONS, useValue: localIcons }],
})
export default class PlayerDetailComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly osrsProxyRepo = inject(OsrsProxyRepo);
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly xpTrackerStore = inject(XpTrackerStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly isHumanVisitor = isHumanVisitor();

  readonly #pageErrorHandler = resolverErrorHandler(
    '/trackers/xp/' + inject(ActivatedRoute).snapshot.params['username'],
  );

  readonly #DEFAULT_SIZE = 14;
  readonly #MORE_SIZE = 7;
  readonly #morePages: WritableSignal<HiscoreEntry[][]> = signal([]);

  readonly player = input.required<Player>();
  /** The resolved player, until `trackPlayer` returns a fresh one. */
  readonly playerDetail: WritableSignal<Player> = linkedSignal(() => this.player());
  /** Below the two-column layout only; there they're always shown */
  readonly showActivities: WritableSignal<boolean> = signal(false);

  /** The live hiscores, only fetched in the browser. */
  readonly todayResource: ResourceRef<HiscoreEntry | undefined> = rxResource({
    params: () =>
      this.isBrowser ? { username: this.player().username, offset: this.xpTrackerStore.scrapingOffset() } : undefined,
    stream: ({ params: { username, offset } }) =>
      this.osrsProxyRepo.getPlayerHiscore(username, offset).pipe(map(hiscore => parseHiscores([hiscore])[0])),
  });
  readonly firstHistoryPage: ResourceRef<HiscoreEntry[] | undefined> = rxResource({
    params: () => ({ username: this.player().username, offset: this.xpTrackerStore.scrapingOffset() }),
    stream: ({ params: { username, offset } }) =>
      this.osrsTrackerRepo
        .getPlayerHiscores(username, offset, this.#DEFAULT_SIZE, 0)
        .pipe(map(scrapedHiscores => parseHiscores(scrapedHiscores))),
  });

  // value() throws while a resource is in its error state, so read it through hasValue()
  readonly today: Signal<HiscoreEntry | undefined> = computed(() =>
    this.todayResource.hasValue() ? this.todayResource.value() : undefined,
  );
  readonly history: Signal<HiscoreEntry[]> = computed(() => [
    ...(this.firstHistoryPage.hasValue() ? (this.firstHistoryPage.value() ?? []) : []),
    ...this.#morePages().flat(),
  ]);
  readonly hasMoreEntries: Signal<boolean> = computed(() => {
    const lastMorePage = this.#morePages().at(-1);
    if (lastMorePage) return lastMorePage.length === this.#MORE_SIZE;
    return this.firstHistoryPage.hasValue() && this.firstHistoryPage.value()?.length === this.#DEFAULT_SIZE;
  });

  readonly loadingMore: WritableSignal<boolean> = signal(false);
  readonly loadMoreFailed: WritableSignal<boolean> = signal(false);

  ngOnInit(): void {
    if (this.isBrowser) this.xpTrackerStore.pushRecentPlayer(this.player().username);
    if (this.isHumanVisitor) this.trackPlayer();
  }

  /** Starts tracking the player (or refreshes them when stale) and shows the player it returns. */
  private trackPlayer(): void {
    const offset = this.xpTrackerStore.scrapingOffset();

    this.osrsTrackerRepo
      .trackPlayer(this.player().username, offset)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        // like the GET, not found and the hiscores being down show the not-found or error page (the handler rethrows);
        // after any other failure the page still shows the player it resolved
        catchError((err: unknown) =>
          err instanceof HttpErrorResponse && [400, 404, 503].includes(err.status)
            ? this.#pageErrorHandler(err)
            : EMPTY,
        ),
      )
      .subscribe({
        next: player => {
          if (!player) return; // the API took us for a bot and recorded nothing
          const wasTracked = isTrackedFor(this.playerDetail(), offset);
          this.playerDetail.set(player);
          // tracking an offset stores its first entry, so load it
          if (!wasTracked && isTrackedFor(player, offset)) this.firstHistoryPage.reload();
        },
        error: () => undefined, // already shown by #pageErrorHandler
      });
  }

  loadMore(): void {
    this.loadingMore.set(true);
    this.loadMoreFailed.set(false);

    this.osrsTrackerRepo
      .getPlayerHiscores(
        this.player().username,
        this.xpTrackerStore.scrapingOffset(),
        this.#MORE_SIZE,
        this.history().length,
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingMore.set(false)),
      )
      .subscribe({
        next: scrapedHiscores => this.#morePages.update(pages => [...pages, parseHiscores(scrapedHiscores)]),
        error: () => this.loadMoreFailed.set(true),
      });
  }
}
