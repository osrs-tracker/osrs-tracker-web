import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, RESPONSE_INIT, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { Observable, shareReplay } from 'rxjs';
import { Card } from '@app/common/ui/cards/card';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Segmented } from '@app/common/ui/controls/segmented';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { StatTile } from '@app/common/ui/cards/stat-tile';
import { StatusPanel } from '@app/common/ui/page/status-panel';
import { timeAgo } from '@app/common/format/time-ago-pipe';
import { AveragePricesAtTime, Lookback, OsrsPricesRepo } from '@app/common/api/osrs-prices-repo';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { isHumanVisitor } from '@app/core/platform/human-visitor';
import { PriceTrackerStore } from '../price-tracker-store';
import { browseLetterOf, startingWith } from '../browse/browse-letters';
import { PriceChart } from './charts/price-chart';
import { ItemHeader } from './item-header';
import {
  binnedVolumes,
  dailyVolumes,
  hasTrades,
  itemStats,
  priceChartSummary,
  priceChange,
  priceTableRows,
  yesterdayAverageSellPrice,
} from './item-prices';
import { ChartTable } from '@app/common/charts/chart-table';
import { ChartDisplay, ChartDisplaySwitch } from '@app/common/charts/chart-display-switch';
import { ItemVolume, VolumeChartState } from './item-volume';
import { PRICE_LINES, PRICE_RANGES, PriceLine, PriceRange, RANGE_OPTIONS } from './price-ranges';
import { ProfitCalculator } from './profit-calculator';
import { LucideArrowLeft, LucideArrowRight } from '@lucide/angular';

/** As many days as the hourly series covers in full, today included: it ends with the last full hour, 168 hours back */
const VOLUME_DAYS = 7;

@Component({
  selector: 'item-detail',
  templateUrl: './item-detail.html',
  imports: [
    RouterLink,
    ChartDisplaySwitch,
    ChartTable,
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
    LucideArrowLeft,
    LucideArrowRight,
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

  /** `null` when there's no such item */
  readonly item = input.required<Item | null>();

  /** The browse page the item is listed on */
  readonly browseLetter = computed(() => {
    const item = this.item();
    return item ? browseLetterOf(item.name) : undefined;
  });
  readonly browseStartingWith = computed(() => startingWith(this.browseLetter() ?? ''));

  readonly rangeOptions = RANGE_OPTIONS;
  readonly range = signal<PriceRange>('1W');
  readonly volumeRange = signal<PriceRange>('1W');

  readonly latest = rxResource({
    params: () => this.item()?.id,
    stream: ({ params: id }) => this.osrsPricesRepo.getLatestPrices(id),
  });

  /**
   * During SSR a failed price load renders as loading, as the browser fetches it again after hydration (failed
   * responses aren't in the transfer cache).
   */
  readonly latestLoading = computed(() => this.latest.isLoading() || (!this.isBrowser && !!this.latest.error()));
  readonly latestFailed = computed(() => this.isBrowser && !!this.latest.error());

  /**
   * Shared per item and between the price and volume charts, so switching back and forth between ranges doesn't
   * refetch. Browser only: the hourly series is
   * about 20KB that SSR would wait for and embed in the page, and the chart it feeds isn't rendered on the server.
   */
  private readonly timeSeries = computed<Record<PriceRange, Observable<AveragePricesAtTime[]>> | undefined>(() => {
    const id = this.item()?.id;
    if (id === undefined || !this.isBrowser) return undefined;

    const fetch = (lookback: Lookback) => this.osrsPricesRepo.getPriceTimeSeries(id, lookback).pipe(shareReplay(1));
    return {
      '1D': fetch(PRICE_RANGES['1D'].lookback),
      '1W': fetch(PRICE_RANGES['1W'].lookback),
      '1M': fetch(PRICE_RANGES['1M'].lookback),
      '1Y': fetch(PRICE_RANGES['1Y'].lookback),
    };
  });

  /** The last 168 hours: the volume, the 24-hour volume and yesterday's average come from it, as does the 1W range */
  readonly hourly = rxResource({
    params: () => this.timeSeries()?.['1W'],
    stream: ({ params: hourly$ }) => hourly$,
    defaultValue: [],
  });
  /** Never loaded on the server, so it renders as loading there */
  readonly hourlyLoading = computed(() => !this.isBrowser || this.hourly.isLoading());

  // A resource cancels the previous request when the range changes, so a slow response can't overwrite a newer one
  readonly priceSeries = rxResource({
    params: () => this.timeSeries()?.[this.range()],
    stream: ({ params: series$ }) => series$,
    defaultValue: [],
  });

  /** Never loaded on the server, so it renders as loading there, not as a range without trades */
  readonly priceSeriesLoading = computed(() => !this.isBrowser || this.priceSeries.isLoading());

  readonly volumeSeries = rxResource({
    params: () => this.timeSeries()?.[this.volumeRange()],
    stream: ({ params: series$ }) => series$,
    defaultValue: [],
  });
  readonly volumeBins = computed(() => {
    const { seconds, bin } = PRICE_RANGES[this.volumeRange()];
    return binnedVolumes(this.volumeSeries.hasValue() ? this.volumeSeries.value() : [], new Date(), seconds, bin);
  });
  readonly volumeChart = computed<VolumeChartState>(() => {
    if (!this.isBrowser || this.volumeSeries.isLoading()) return 'loading';
    if (!this.volumeSeries.error()) return 'ready';
    // The same series as the price chart's, which says so with a retry
    return this.priceSeries.error() && this.range() === this.volumeRange() ? 'not loaded' : 'failed';
  });

  readonly priceChartData = computed(() => {
    const since = Date.now() / 1000 - PRICE_RANGES[this.range()].seconds;
    return this.priceSeries.hasValue() ? this.priceSeries.value().filter(price => price.timestamp >= since) : [];
  });
  readonly priceChartLabel = computed(() => priceChartSummary(this.priceChartData(), this.rangeTitle()));
  /** Lines hidden from the price chart and table by their legend entry; one always stays */
  readonly hiddenLines = signal<ReadonlySet<PriceLine>>(new Set());
  /** The legend: each line's change over the range, from its first trade to its last, and whether it's shown */
  readonly priceLegend = computed(() => {
    const prices = this.priceChartData();
    const hidden = this.hiddenLines();
    return [
      {
        name: PRICE_LINES[0],
        swatch: 'border-accent bg-accent/14',
        change: priceChange(prices.map(price => price.avgHighPrice)),
      },
      {
        name: PRICE_LINES[1],
        swatch: 'border-sold bg-sold/14',
        change: priceChange(prices.map(price => price.avgLowPrice)),
      },
    ].map(line => ({ ...line, on: !hidden.has(line.name), only: hidden.size > 0 && !hidden.has(line.name) }));
  });
  readonly priceDisplay = signal<ChartDisplay>('chart');
  readonly priceTable = computed(() => {
    const { bin, title } = PRICE_RANGES[this.range()];
    // The time, then a column per shown line
    const shown = (_: unknown, i: number) => i === 0 || !this.hiddenLines().has(PRICE_LINES[i - 1]);
    return {
      caption: `Average prices per ${bin} over the last ${title}, newest first, in your time zone`,
      columns: [bin[0].toUpperCase() + bin.slice(1), ...PRICE_LINES.map(line => `${line} (gp)`)].filter(shown),
      rows: priceTableRows(this.priceChartData(), bin).map(row => ({ ...row, cells: row.cells.filter(shown) })),
    };
  });
  readonly rangeTitle = computed(() => PRICE_RANGES[this.range()].title);
  /** Rarely traded items often have no trades on 1D: the chart then says so, and offers the next range up */
  readonly priceChartEmpty = computed(() => !hasTrades(this.priceChartData()));
  readonly nextRange = computed(() => {
    const next = PRICE_RANGES[this.range()].next;
    return next && { value: next, title: PRICE_RANGES[next].title };
  });

  private readonly latestPrices = computed(() => (this.latest.hasValue() ? this.latest.value() : undefined));
  private readonly hourlySeries = computed(() => (this.hourly.hasValue() ? this.hourly.value() : []));

  readonly sellPrice = computed(() => this.latestPrices()?.low ?? null);
  readonly yesterdayAverage = computed(() => yesterdayAverageSellPrice(this.hourlySeries(), new Date()));
  readonly volumes = computed(() => dailyVolumes(this.hourlySeries(), new Date(), VOLUME_DAYS));

  readonly stats = computed(() =>
    itemStats({
      item: this.item()!,
      latest: this.latestPrices(),
      latestLoading: this.latestLoading(),
      latestFailed: this.latestFailed(),
      hourly: this.hourlySeries(),
      hourlyLoading: this.hourlyLoading(),
      hourlyFailed: !!this.hourly.error(),
      now: new Date(),
      timeAgo,
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

  /** From the empty chart's button, which goes away with the change: focus moves to the card's heading */
  showNextRange(range: PriceRange, heading: HTMLElement): void {
    heading.focus({ preventScroll: true });
    this.selectRange(range);
  }

  /** Shows or hides a price line; the last one shown stays */
  toggleLine(line: PriceLine): void {
    const hidden = new Set(this.hiddenLines());
    if (hidden.has(line)) hidden.delete(line);
    else if (hidden.size < PRICE_LINES.length - 1) hidden.add(line);
    else return;
    this.hiddenLines.set(hidden);
    this.analyticsService.trackOption('item_price_line', `${line}: ${hidden.has(line) ? 'hidden' : 'shown'}`);
  }

  /** One retry for every series, as one failure shows once, in the chart's place */
  retryTimeSeries(): void {
    if (this.priceSeries.error()) this.priceSeries.reload();
    this.retryVolume();
  }

  /** The volume card's retries: its summary's series, and its chart's */
  retryVolume(): void {
    if (this.hourly.error()) this.hourly.reload();
    if (this.volumeSeries.error()) this.volumeSeries.reload();
  }

  searchItem(query: string): void {
    void this.router.navigate(['/trackers/price'], { queryParams: { q: query } });
  }
}
