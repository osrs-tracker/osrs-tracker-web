import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  InputSignal,
  OnInit,
  PLATFORM_ID,
  RESPONSE_INIT,
  ResourceRef,
  Signal,
  WritableSignal,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { Observable, shareReplay } from 'rxjs';
import { Card } from '@app/common/ui/cards/card';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { StatTile } from '@app/common/ui/cards/stat-tile';
import { StatusPanel } from '@app/common/ui/page/status-panel';
import { TimeAgoPipe } from '@app/common/format/time-ago-pipe';
import { AveragePricesAtTime, LatestPrices, Lookback, OsrsPricesRepo } from '@app/common/api/osrs-prices-repo';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { isHumanVisitor } from '@app/core/platform/human-visitor';
import { PriceTrackerStore } from '../price-tracker-store';
import { browseLetterOf, startingWith } from '../browse/browse-letters';
import { PriceChart } from './charts/price-chart';
import { ItemHeader } from './item-header';
import { DailyVolume, ItemStat, dailyVolumes, itemStats, yesterdayAverageSellPrice } from './item-prices';
import { ItemVolume } from './item-volume';
import { ProfitCalculator } from './profit-calculator';
import { Glyph } from '@app/common/ui/glyph/glyph';

type PriceRange = '1D' | '1W' | '1M' | '1Y';

/**
 * The Wiki time series behind each range, and how far back the range goes. The 1W series, hourly, also feeds the
 * volume.
 */
const PRICE_RANGES: Record<PriceRange, { lookback: Lookback; seconds: number; title: string }> = {
  '1D': { lookback: '24h', seconds: 86400, title: 'day' },
  '1W': { lookback: '7d', seconds: 7 * 86400, title: 'week' },
  '1M': { lookback: '30d', seconds: 30 * 86400, title: 'month' },
  '1Y': { lookback: '1y', seconds: 365 * 86400, title: 'year' },
};

/** As many days as the hourly series covers in full, today included: it ends with the last full hour, 168 hours back */
const VOLUME_DAYS = 7;

@Component({
  selector: 'item-detail',
  templateUrl: './item-detail.html',
  imports: [
    RouterLink,
    Card,
    LoadError,
    Segmented,
    Skeleton,
    StatTile,
    StatusPanel,
    ItemHeader,
    ItemVolume,
    PriceChart,
    ProfitCalculator,
    Glyph,
  ],
})
export default class ItemDetail implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly osrsPricesRepo = inject(OsrsPricesRepo);
  private readonly priceTrackerStore = inject(PriceTrackerStore);
  private readonly router = inject(Router);
  // Only available during SSR, `null` in the browser
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });
  private readonly isHumanVisitor = isHumanVisitor();
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly timeAgo = new TimeAgoPipe();

  /** `null` when there's no such item */
  readonly item: InputSignal<Item | null> = input.required();

  /** The browse page the item is listed on */
  readonly browseLetter: Signal<string | undefined> = computed(() => {
    const item = this.item();
    return item ? browseLetterOf(item.name) : undefined;
  });
  readonly browseStartingWith: Signal<string> = computed(() => startingWith(this.browseLetter() ?? ''));

  readonly rangeOptions: SegmentedOption<PriceRange>[] = (Object.keys(PRICE_RANGES) as PriceRange[]).map(range => ({
    value: range,
    label: range,
    title: `Last ${PRICE_RANGES[range].title}`,
  }));
  readonly range: WritableSignal<PriceRange> = signal('1W');

  readonly latest: ResourceRef<LatestPrices | undefined> = rxResource({
    params: () => this.item()?.id,
    stream: ({ params: id }) => this.osrsPricesRepo.getLatestPrices(id),
  });

  /**
   * During SSR a failed price load renders as loading, as the browser fetches it again after hydration (failed
   * responses aren't in the transfer cache).
   */
  readonly latestLoading: Signal<boolean> = computed(
    () => this.latest.isLoading() || (!this.isBrowser && !!this.latest.error()),
  );
  readonly latestFailed: Signal<boolean> = computed(() => this.isBrowser && !!this.latest.error());

  /**
   * Shared per item, so switching back and forth between ranges doesn't refetch. Browser only: the hourly series is
   * about 20KB that SSR would wait for and embed in the page, and the chart it feeds isn't rendered on the server.
   */
  private readonly timeSeries: Signal<Record<PriceRange, Observable<AveragePricesAtTime[]>> | undefined> = computed(
    () => {
      const id = this.item()?.id;
      if (id === undefined || !this.isBrowser) return undefined;

      const fetch = (lookback: Lookback) => this.osrsPricesRepo.getPriceTimeSeries(id, lookback).pipe(shareReplay(1));
      return {
        '1D': fetch(PRICE_RANGES['1D'].lookback),
        '1W': fetch(PRICE_RANGES['1W'].lookback),
        '1M': fetch(PRICE_RANGES['1M'].lookback),
        '1Y': fetch(PRICE_RANGES['1Y'].lookback),
      };
    },
  );

  /** The last 168 hours: the volume, the 24-hour volume and yesterday's average come from it, as does the 1W range */
  readonly hourly: ResourceRef<AveragePricesAtTime[]> = rxResource({
    params: () => this.timeSeries()?.['1W'],
    stream: ({ params: hourly$ }) => hourly$,
    defaultValue: [],
  });
  /** Never loaded on the server, so it renders as loading there */
  readonly hourlyLoading: Signal<boolean> = computed(() => !this.isBrowser || this.hourly.isLoading());

  // A resource cancels the previous request when the range changes, so a slow response can't overwrite a newer one
  readonly priceSeries: ResourceRef<AveragePricesAtTime[]> = rxResource({
    params: () => this.timeSeries()?.[this.range()],
    stream: ({ params: series$ }) => series$,
    defaultValue: [],
  });

  readonly priceChartData: Signal<AveragePricesAtTime[]> = computed(() => {
    const since = Date.now() / 1000 - PRICE_RANGES[this.range()].seconds;
    return this.priceSeries.hasValue() ? this.priceSeries.value().filter(price => price.timestamp >= since) : [];
  });
  readonly priceChartLabel: Signal<string> = computed(
    () => `Instant buy and instant sell price over the last ${PRICE_RANGES[this.range()].title}`,
  );

  private readonly latestPrices: Signal<LatestPrices | undefined> = computed(() =>
    this.latest.hasValue() ? this.latest.value() : undefined,
  );
  private readonly hourlySeries: Signal<AveragePricesAtTime[]> = computed(() =>
    this.hourly.hasValue() ? this.hourly.value() : [],
  );

  readonly sellPrice: Signal<number | null> = computed(() => this.latestPrices()?.low ?? null);
  readonly yesterdayAverage: Signal<number | null> = computed(() =>
    yesterdayAverageSellPrice(this.hourlySeries(), new Date()),
  );
  readonly volumes: Signal<DailyVolume[]> = computed(() => dailyVolumes(this.hourlySeries(), new Date(), VOLUME_DAYS));

  readonly stats: Signal<ItemStat[]> = computed(() =>
    itemStats({
      item: this.item()!,
      latest: this.latestPrices(),
      latestLoading: this.latestLoading(),
      latestFailed: this.latestFailed(),
      hourly: this.hourlySeries(),
      hourlyLoading: this.hourlyLoading(),
      hourlyFailed: !!this.hourly.error(),
      now: new Date(),
      timeAgo: time => this.timeAgo.transform(time),
    }),
  );

  ngOnInit(): void {
    const item = this.item();
    if (!item) {
      if (this.responseInit) this.responseInit.status = 404;
      return;
    }

    const { id, name, icon } = item;
    this.priceTrackerStore.pushRecentItem({ id, name, icon });

    // fire and forget: a lookup that isn't recorded only leaves the item out of the recent lookups
    if (this.isHumanVisitor) this.osrsTrackerRepo.recordItemLookup(id).subscribe({ error: () => undefined });
  }

  selectRange(range: PriceRange): void {
    this.range.set(range);
    this.analyticsService.trackOption('item_range', range);
  }

  searchItem(query: string): void {
    void this.router.navigate(['/trackers/price'], { queryParams: { q: query } });
  }
}
