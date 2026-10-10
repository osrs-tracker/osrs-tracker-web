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
import { AveragePricesAtTime, LatestPrices, OsrsPricesRepo, TimeSpan } from '@app/common/api/osrs-prices-repo';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { isHumanVisitor } from '@app/core/platform/human-visitor';
import { PriceTrackerStore } from '../price-tracker-store';
import { browseLetterOf, startingWith } from '../browse/browse-letters';
import { PriceChart } from './charts/price-chart';
import { geTax, isGeTaxExempt } from './ge-tax';
import { ItemHeader } from './item-header';
import { DailyVolume, dailyVolumes, formatWhole, last24HourVolume, yesterdayAverageSellPrice } from './item-prices';
import { ItemVolume } from './item-volume';
import { ProfitCalculator } from './profit-calculator';

type PriceRange = '1D' | '1W' | '1M' | '1Y';

/** The Wiki time series behind each range, and how far back the range goes. The 1h series also feeds the volume. */
const PRICE_RANGES: Record<PriceRange, { timeSpan: TimeSpan; seconds: number; title: string }> = {
  '1D': { timeSpan: TimeSpan.FIVE_MINUTES, seconds: 86400, title: 'day' },
  '1W': { timeSpan: TimeSpan.HOUR, seconds: 7 * 86400, title: 'week' },
  '1M': { timeSpan: TimeSpan.SIX_HOURS, seconds: 30 * 86400, title: 'month' },
  '1Y': { timeSpan: TimeSpan.DAY, seconds: 365 * 86400, title: 'year' },
};

const VOLUME_DAYS = 14;

interface ItemStat {
  label: string;
  value: string;
  sub: string;
  info: string;
  tip?: string;
  loading?: boolean;
}

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
  ],
})
export default class ItemDetail implements OnInit {
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
   * about 40KB that SSR would wait for and embed in the page, and the chart it feeds isn't rendered on the server.
   */
  private readonly timeSeries: Signal<Record<PriceRange, Observable<AveragePricesAtTime[]>> | undefined> = computed(
    () => {
      const id = this.item()?.id;
      if (id === undefined || !this.isBrowser) return undefined;

      const fetch = (timeSpan: TimeSpan) => this.osrsPricesRepo.getPriceTimeSeries(id, timeSpan).pipe(shareReplay(1));
      return {
        '1D': fetch(PRICE_RANGES['1D'].timeSpan),
        '1W': fetch(PRICE_RANGES['1W'].timeSpan),
        '1M': fetch(PRICE_RANGES['1M'].timeSpan),
        '1Y': fetch(PRICE_RANGES['1Y'].timeSpan),
      };
    },
  );

  /** The last 365 hours: the volume, the 24-hour volume and yesterday's average come from it, as does the 1W range */
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

  readonly stats: Signal<ItemStat[]> = computed(() => {
    const item = this.item()!;
    const latest = this.latestPrices();
    const latestLoading = this.latestLoading();
    const latestFailed = this.latestFailed();
    const exempt = isGeTaxExempt(item.id);

    const price = (label: string, info: string, value?: number, time?: Date): ItemStat => {
      if (latestFailed) return { label, info, value: '–', sub: "Couldn't load the price" };
      if (!value) return { label, info, value: '–', sub: 'No recent trades', loading: latestLoading };
      const ago = this.timeAgo.transform(time) ?? '';
      // Shortened to fit the tile: "2 min ago"
      const short = ago
        .replace(/ seconds? /, ' sec ')
        .replace(/ minutes? /, ' min ')
        .replace(/ hours? /, ' hr ');
      return { label, info, value: formatWhole(value), sub: `Last trade ${short}`, tip: `Last trade was ${ago}.` };
    };

    const high = latest?.high;
    const low = latest?.low;
    const margin: ItemStat = {
      label: 'Margin after tax',
      info: exempt
        ? 'Instant buy minus instant sell. This item is exempt from GE tax.'
        : 'Instant buy minus instant sell, minus the 2% GE tax on the sale.',
      value: high && low ? formatWhole(high - low - geTax(item.id, high)) : '–',
      sub: latestFailed ? "Couldn't load the price" : exempt ? 'No tax on this item' : 'Buy − sell − 2% tax',
      loading: latestLoading,
    };

    return [
      price('Instant buy', 'The price of the latest instant buy.', high, latest?.highTime),
      price('Instant sell', 'The price of the latest instant sell.', low, latest?.lowTime),
      margin,
      {
        label: 'Daily volume',
        info: 'The number of times the item has been traded within the last 24 hours.',
        value: this.hourly.error() ? '–' : formatWhole(last24HourVolume(this.hourlySeries(), new Date())),
        sub: this.hourly.error() ? "Couldn't load the volume" : 'Last 24 hours',
        loading: this.hourlyLoading(),
      },
      {
        label: 'Buy limit',
        info: 'The amount of times the item can be bought every 4 hours.',
        value: item.limit ? formatWhole(item.limit) : '–',
        sub: item.limit ? 'Every 4 hours' : 'Unknown',
      },
      {
        label: 'High alch',
        info: 'Coins received from casting High Level Alchemy on the item.',
        value: item.highalch ? formatWhole(item.highalch) : '–',
        sub: item.highalch ? `Low alch ${formatWhole(item.lowalch ?? 0)}` : "Can't be alched for coins",
      },
    ];
  });

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

  searchItem(query: string): void {
    void this.router.navigate(['/trackers/price'], { queryParams: { q: query } });
  }
}
