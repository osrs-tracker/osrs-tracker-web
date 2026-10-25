import { DecimalPipe, formatDate, isPlatformServer } from '@angular/common';
import {
  Component,
  PLATFORM_ID,
  TransferState,
  afterNextRender,
  computed,
  inject,
  makeStateKey,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin, map, of, tap } from 'rxjs';
import { announceChanges } from '@app/common/a11y/announcer';
import { OsrsPricesRepo, TimeSpan } from '@app/common/api/osrs-prices-repo';
import { NewItem, OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { Icon } from '@app/common/icon/icon';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { Tooltip } from '@app/common/ui/tooltip/tooltip';
import { LucideArrowLeft } from '@lucide/angular';
import { formatTableNumber, staleAge } from '../tables/price-table';
import { DetailsToggle } from '../tables/details-toggle';
import { StaleNote, StalePrice } from '../tables/stale-price';
import { yesterdayStart } from '../utc-day';

/** All the API sends; the page shows them 25 at a time */
const LIMIT = 100;
const PAGE_SIZE = 25;
/** The day the API began dating items: those it had before aren't listed (it kept no history to backfill from) */
export const DATED_SINCE = new Date(Date.UTC(2026, 9, 25));

/** An item's instant-buy price, when that last traded (ms) and yesterday's trades, from the Wiki's lists */
export interface ItemPrices {
  /** `null` without a trade yet */
  price: number | null;
  tradedAt: number | null;
  volume: number;
}

/** The new items' prices by id, and when they were loaded (ms): the age of a price counts from there */
export interface NewItemPrices {
  byId: Record<number, ItemPrices>;
  loadedAt: number;
}

/** The items a game update added on one UTC day */
export interface AddedDay {
  label: string;
  items: NewItem[];
}

const PRICES_KEY = makeStateKey<NewItemPrices>('new-items-prices');

/**
 * New on the GE: the items the API added most recently, under the day each came, with their latest price and daily
 * volume. The server renders it from the API's list and its copies of the Wiki's lists, and hands the browser the prices
 * of all the listed items (they're few), so hydration and "Show 25 more" fetch nothing. After a client-side navigation,
 * or when the server's prices failed, the browser loads the Wiki's lists itself.
 */
@Component({
  selector: 'new-items-page',
  templateUrl: './new-items-page.html',
  imports: [
    DecimalPipe,
    RouterLink,
    LucideArrowLeft,
    DetailsToggle,
    Icon,
    LoadError,
    Skeleton,
    StaleNote,
    StalePrice,
    Tooltip,
  ],
})
export default class NewItemsPage {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly osrsPricesRepo = inject(OsrsPricesRepo);
  private readonly transferState = inject(TransferState);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

  /** Read once, on the first render: a retry or a later visit loads the lists */
  private transferred = this.isServer ? null : this.transferState.get(PRICES_KEY, null);

  readonly items = rxResource({ stream: () => this.osrsTrackerRepo.getNewItems(LIMIT) });

  readonly prices = rxResource({
    // Nothing to price without items: `undefined` keeps the resource idle
    params: () =>
      this.items.hasValue() && this.items.value().length ? this.items.value().map(item => item.id) : undefined,
    stream: ({ params: ids }) => {
      const transferred = this.transferred;
      this.transferred = null;
      if (transferred && ids.every(id => id in transferred.byId)) return of(transferred);

      return forkJoin({
        latest: this.osrsPricesRepo.getAllLatestPrices(),
        day: this.osrsPricesRepo.getAveragePrices(TimeSpan.DAY, yesterdayStart()),
      }).pipe(
        map(({ latest, day }): NewItemPrices => {
          const byId = Object.fromEntries(
            ids.map((id): [number, ItemPrices] => {
              const { high, highTime } = latest[id] ?? {};
              return [
                id,
                {
                  price: high ?? null,
                  tradedAt: high ? highTime * 1000 : null,
                  volume: (day[id]?.highPriceVolume ?? 0) + (day[id]?.lowPriceVolume ?? 0),
                },
              ];
            }),
          );
          return { byId, loadedAt: Date.now() };
        }),
        tap(prices => {
          if (this.isServer) this.transferState.set(PRICES_KEY, prices);
        }),
      );
    },
  });

  /** On the server, failed prices render as loading, and the browser loads them itself */
  readonly pricesFailed = computed(() => !this.isServer && !!this.prices.error());

  readonly shown = signal(PAGE_SIZE);

  /** The shown items, under the UTC day each was added, newest first as the API sends them */
  readonly days = computed((): AddedDay[] => {
    if (!this.items.hasValue()) return [];
    const days: AddedDay[] = [];
    for (const item of this.items.value().slice(0, this.shown())) {
      const label = formatDate(item.addedAt, 'EEEE d MMMM y', 'en-US', 'UTC');
      if (days.at(-1)?.label === label) days.at(-1)!.items.push(item);
      else days.push({ label, items: [item] });
    }
    return days;
  });

  readonly total = computed(() => (this.items.hasValue() ? this.items.value().length : 0));
  readonly shownCount = computed(() => Math.min(this.shown(), this.total()));
  readonly more = computed(() => Math.min(PAGE_SIZE, this.total() - this.shownCount()));

  /** Phones: the row whose details are open */
  readonly expanded = signal<number | null>(null);

  readonly datedSince = formatDate(DATED_SINCE, 'd MMMM y', 'en-US', 'UTC');

  /** Name bar widths, varied per row so the skeleton rows don't look like a barcode */
  readonly skeletons = ['w-40', 'w-30', 'w-46', 'w-34', 'w-26', 'w-38', 'w-32', 'w-44', 'w-28', 'w-36'];

  protected readonly formatTableNumber = formatTableNumber;

  /** What a screen reader hears after "Show 25 more" or a retry: the count, or the failure */
  private readonly announcement = computed(() => {
    if (this.items.error()) return 'New items didn’t load.';
    if (this.pricesFailed()) return 'Prices didn’t load.';
    if (!this.items.hasValue()) return null;
    if (!this.total()) return `No new items since ${this.datedSince}.`;
    return `Showing ${this.shownCount()} of ${this.total()} items.`;
  });

  constructor() {
    afterNextRender(() => this.transferState.remove(PRICES_KEY));
    announceChanges(this.announcement);
  }

  showMore(): void {
    this.shown.update(shown => shown + PAGE_SIZE);
  }

  toggleDetails(id: number): void {
    this.expanded.update(expanded => (expanded === id ? null : id));
  }

  /** The item's prices, once loaded */
  pricesOf(id: number): ItemPrices | null {
    return this.prices.hasValue() ? (this.prices.value().byId[id] ?? null) : null;
  }

  /** How long ago the price last traded, when that's an hour or more */
  staleFor(prices: ItemPrices): string | null {
    return prices.tradedAt !== null ? staleAge(prices.tradedAt, this.prices.value()!.loadedAt) : null;
  }
}
