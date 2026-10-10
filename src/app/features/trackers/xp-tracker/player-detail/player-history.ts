import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  PLATFORM_ID,
  ResourceRef,
  Signal,
  WritableSignal,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HiscoreEntry } from '@osrs-tracker/models';
import { finalize } from 'rxjs';
import { OsrsProxyRepo } from '@app/common/api/osrs-proxy-repo';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';

/** 15 entries: the last week and the week before it, for the stat tiles. 30D and 60D load up to 61. */
const DEFAULT_SIZE = 15;
const MORE_SIZE = 7;
/** The history is kept for about 60 days, so 60 days and today is all there is (and 30D's previous period fits) */
const PERIOD_SIZE = 61;

export interface PlayerHistory {
  /** The live hiscores, only fetched in the browser. */
  readonly todayResource: ResourceRef<HiscoreEntry | undefined>;
  readonly firstPage: ResourceRef<HiscoreEntry[] | undefined>;

  readonly today: Signal<HiscoreEntry | undefined>;
  /** The live hiscores aren't in yet; also during SSR, which doesn't fetch them, so hydration doesn't change the page */
  readonly todayLoading: Signal<boolean>;
  /** The first page is in */
  readonly loaded: Signal<boolean>;
  /** The stored daily entries loaded so far, newest first */
  readonly entries: Signal<HiscoreEntry[]>;
  readonly hasMore: Signal<boolean>;
  /** The period's history is in (or there's no more, or it failed), so the chart and tiles are drawn once, complete */
  readonly periodLoaded: Signal<boolean>;
  /** The live hiscores; until they load (or when they fail) the newest tracked entry */
  readonly current: Signal<HiscoreEntry | undefined>;
  /** When the daily check last stored the player's stats (a failed check stores nothing): the newest entry's date */
  readonly lastCheckedAt: Signal<Date | undefined>;

  readonly loadingMore: Signal<boolean>;
  readonly loadMoreFailed: Signal<boolean>;
  /** Loads the next `size` days of history, a week by default */
  loadMore(size?: number): void;
  /** Loads as much as the failed load asked for (a longer period asks for more than a week) */
  retryLoadMore(): void;
  /** Reloads the live hiscores, and the first page if it failed */
  retry(): void;
}

/**
 * A player's live hiscores and stored history at the visitor's offset: the first page (two weeks) and the pages loaded
 * after it, by the visitor or because a longer `period` needs them. Call it in an injection context, like a resource.
 */
export function playerHistory(params: {
  username: string;
  offset: Signal<number>;
  /** False when there's no such player: nothing is fetched */
  enabled: Signal<boolean>;
  /** Days the chart and tiles cover */
  period: Signal<number>;
}): PlayerHistory {
  const { username, offset, enabled, period } = params;
  const destroyRef = inject(DestroyRef);
  const osrsProxyRepo = inject(OsrsProxyRepo);
  const osrsTrackerRepo = inject(OsrsTrackerRepo);
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Pages loaded after the first, with the size each asked for: a shorter page is the end of the history */
  const morePages: WritableSignal<{ entries: HiscoreEntry[]; size: number }[]> = signal([]);
  const loadingMore = signal(false);
  const loadMoreFailed = signal(false);
  let failedMoreSize = MORE_SIZE;

  const todayResource = rxResource({
    params: () => (isBrowser && enabled() ? { username, offset: offset() } : undefined),
    stream: ({ params }) => osrsProxyRepo.getPlayerHiscore(params.username, params.offset),
  });
  const firstPage = rxResource({
    params: () => (enabled() ? { username, offset: offset() } : undefined),
    stream: ({ params }) => osrsTrackerRepo.getPlayerHiscores(params.username, params.offset, DEFAULT_SIZE, 0),
  });

  // value() throws while a resource is in its error state, so read it through hasValue()
  const today = computed(() => (todayResource.hasValue() ? todayResource.value() : undefined));
  const loaded = computed(() => firstPage.hasValue());
  const entries = computed(() => [
    ...(firstPage.hasValue() ? (firstPage.value() ?? []) : []),
    ...morePages().flatMap(page => page.entries),
  ]);
  const hasMore = computed(() => {
    const lastMorePage = morePages().at(-1);
    if (lastMorePage) return lastMorePage.entries.length === lastMorePage.size;
    return firstPage.hasValue() && firstPage.value()?.length === DEFAULT_SIZE;
  });
  /** The entries the period needs: its days and the period before them, as far as the history goes */
  const periodSize = computed(() => Math.min(period() * 2 + 1, PERIOD_SIZE));

  function loadMore(size: number = MORE_SIZE): void {
    loadingMore.set(true);
    loadMoreFailed.set(false);

    osrsTrackerRepo
      .getPlayerHiscores(username, offset(), size, entries().length)
      .pipe(
        takeUntilDestroyed(destroyRef),
        finalize(() => loadingMore.set(false)),
      )
      .subscribe({
        next: page => morePages.update(pages => [...pages, { entries: page, size }]),
        error: () => {
          failedMoreSize = size;
          loadMoreFailed.set(true);
        },
      });
  }

  // A longer period loads the history it needs
  effect(() => {
    const needed = periodSize();
    if (!loaded() || entries().length >= needed || !hasMore()) return;
    untracked(() => {
      if (!loadingMore()) loadMore(needed - entries().length);
    });
  });

  return {
    todayResource,
    firstPage,
    today,
    todayLoading: computed(() => !todayResource.hasValue() && !todayResource.error()),
    loaded,
    entries,
    hasMore,
    periodLoaded: computed(() => loaded() && (entries().length >= periodSize() || !hasMore() || loadMoreFailed())),
    current: computed(() => today() ?? entries()[0]),
    lastCheckedAt: computed(() => entries()[0]?.date),
    loadingMore: loadingMore.asReadonly(),
    loadMoreFailed: loadMoreFailed.asReadonly(),
    loadMore,
    retryLoadMore: () => loadMore(failedMoreSize),
    retry: () => {
      todayResource.reload();
      if (firstPage.error()) firstPage.reload();
    },
  };
}
