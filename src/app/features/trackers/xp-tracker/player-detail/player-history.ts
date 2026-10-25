import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Signal, computed, effect, inject, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HiscoreEntry } from '@osrs-tracker/models';
import { map } from 'rxjs';
import { OsrsProxyRepo } from '@app/common/api/osrs-proxy-repo';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { paging } from '@app/common/paging/paging';

/** 8 entries: the last week and the check it starts from. Longer periods load up to 91. */
const DEFAULT_SIZE = 8;
const MORE_SIZE = 7;
/** The history is kept for about 90 days, so 90 days and today is all there is */
export const PERIOD_SIZE = 91;

interface PageRequest {
  offset: number;
  size: number;
  skip: number;
}

/** The history as the page reads it; the resources stay inside, as their `value()` throws in the error state */
export interface PlayerHistory {
  /** The live hiscores, only fetched in the browser */
  readonly today: Signal<HiscoreEntry | undefined>;
  readonly todayFailed: Signal<boolean>;
  readonly firstPageFailed: Signal<boolean>;
  readonly previousPeriodFailed: Signal<boolean>;
  /** Also true during SSR, which doesn't fetch the live hiscores, so hydration doesn't change the page */
  readonly todayLoading: Signal<boolean>;
  readonly loaded: Signal<boolean>;
  /** The stored daily entries loaded so far, newest first */
  readonly entries: Signal<HiscoreEntry[]>;
  /** `entries` and, when older, the check the period before starts from, so the stat tiles can compare the two */
  readonly comparedEntries: Signal<HiscoreEntry[]>;
  readonly hasMore: Signal<boolean>;
  /** The period's history is in (or there's no more, or it failed), so the chart is drawn once, complete */
  readonly periodLoaded: Signal<boolean>;
  readonly milestonePeriodLoaded: Signal<boolean>;
  /**
   * `periodLoaded`, and the check the period before starts from is in (or failed), so the stat tiles are drawn once,
   * with their comparison. Only the tiles wait for it: it's the slowest request when the API is slow.
   */
  readonly comparedLoaded: Signal<boolean>;
  readonly current: Signal<HiscoreEntry | undefined>;
  readonly lastCheckedAt: Signal<Date | undefined>;

  readonly loadingMore: Signal<boolean>;
  readonly loadMoreFailed: Signal<boolean>;
  loadMore(size?: number): void;
  /** Loads as much as the failed load asked for (a longer period asks for more than a week) */
  retryLoadMore(): void;
  reloadToday(): void;
  reloadPreviousPeriod(): void;
  /** After tracking starts at the offset, which stores its first entry, or when the first page failed */
  reloadFirstPage(): void;
  retry(): void;
}

/** Call it in an injection context, like a resource. */
export function playerHistory(params: {
  username: string;
  offset: Signal<number>;
  enabled: Signal<boolean>;
  period: Signal<number>;
  milestonePeriod: Signal<number>;
}): PlayerHistory {
  const { username, offset, enabled, period, milestonePeriod } = params;
  const osrsProxyRepo = inject(OsrsProxyRepo);
  const osrsTrackerRepo = inject(OsrsTrackerRepo);
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Like the first page, the pages after it belong to one offset, so another offset starts over. Each page keeps the
  // size it asked for: a shorter page is the end of the history.
  const more = paging({
    reset: offset,
    fetch: ({ offset, size, skip }: PageRequest) =>
      osrsTrackerRepo.getPlayerHiscores(username, offset, size, skip).pipe(map(entries => ({ entries, size }))),
  });
  const morePages = more.pages;
  const loadingMore = more.loading;
  const loadMoreFailed = computed(() => !!more.failed());

  const todayResource = rxResource({
    params: () => (isBrowser && enabled() ? { username, offset: offset() } : undefined),
    stream: ({ params }) => osrsProxyRepo.getPlayerHiscore(params.username, params.offset),
  });
  const firstPage = rxResource({
    params: () => (enabled() ? { username, offset: offset() } : undefined),
    stream: ({ params }) => osrsTrackerRepo.getPlayerHiscores(params.username, params.offset, DEFAULT_SIZE, 0),
  });
  // One entry instead of the period before's days: the page only needs its start, to compare the periods' XP. The
  // history ends at PERIOD_SIZE, so 60D and 90D have none (60D's period before would only be half covered).
  const previousPeriodStart = rxResource({
    params: () => {
      const skip = period() * 2;
      return enabled() && skip < PERIOD_SIZE ? { username, offset: offset(), skip } : undefined;
    },
    stream: ({ params }) =>
      osrsTrackerRepo.getPlayerHiscores(params.username, params.offset, 1, params.skip).pipe(map(page => page[0])),
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
  /** The entries a period needs: its days and the check they start from, as far as the history goes */
  const periodSize = (days: number): number => Math.min(days + 1, PERIOD_SIZE);
  const isLoaded = (days: number): boolean =>
    loaded() && (entries().length >= periodSize(days) || !hasMore() || loadMoreFailed());
  const periodLoaded = computed(() => isLoaded(period()));

  function loadMore(size: number = MORE_SIZE): void {
    more.load({ offset: offset(), size, skip: entries().length });
  }

  effect(() => {
    const needed = periodSize(Math.max(period(), milestonePeriod()));
    if (!loaded() || entries().length >= needed || !hasMore()) return;
    untracked(() => {
      if (!loadingMore()) loadMore(needed - entries().length);
    });
  });

  return {
    today,
    todayFailed: computed(() => !!todayResource.error()),
    firstPageFailed: computed(() => !!firstPage.error()),
    previousPeriodFailed: computed(() => !!previousPeriodStart.error()),
    todayLoading: computed(() => !todayResource.hasValue() && !todayResource.error()),
    loaded,
    entries,
    comparedEntries: computed(() => {
      const start = previousPeriodStart.hasValue() ? previousPeriodStart.value() : undefined;
      const oldest = entries().at(-1);
      return start && oldest && start.date < oldest.date ? [...entries(), start] : entries();
    }),
    hasMore,
    periodLoaded,
    milestonePeriodLoaded: computed(() => isLoaded(milestonePeriod())),
    comparedLoaded: computed(
      // not while it reloads after failing ('reloading'): the tiles stay, showing the failure until it's in
      () => periodLoaded() && previousPeriodStart.status() !== 'loading',
    ),
    current: computed(() => today() ?? entries()[0]),
    lastCheckedAt: computed(() => entries()[0]?.date),
    loadingMore,
    loadMoreFailed,
    loadMore,
    // the size that failed, from the entries loaded now
    retryLoadMore: () => loadMore(more.failed()?.size),
    reloadToday: () => todayResource.reload(),
    reloadPreviousPeriod: () => previousPeriodStart.reload(),
    reloadFirstPage: () => firstPage.reload(),
    retry: () => {
      todayResource.reload();
      if (firstPage.error()) firstPage.reload();
    },
  };
}
