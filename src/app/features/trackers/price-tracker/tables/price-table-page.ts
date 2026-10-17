import { DecimalPipe, isPlatformServer } from '@angular/common';
import {
  Component,
  PLATFORM_ID,
  TransferState,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  makeStateKey,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { formatDistanceStrict } from 'date-fns';
import { forkJoin, map, tap } from 'rxjs';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { LatestPriceList, OsrsPricesRepo, TimeSpan } from '@app/common/api/osrs-prices-repo';
import { formatWhole } from '@app/common/format/number-format';
import { Icon } from '@app/common/icon/icon';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { Glyph } from '@app/common/ui/glyph/glyph';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { InfoTooltip } from '@app/common/ui/tooltip/info-tooltip';
import { Tooltip } from '@app/common/ui/tooltip/tooltip';
import { isGeTaxExempt } from '../item-detail/ge-tax';
import { yesterdayStart } from '../utc-day';
import {
  BuyAt,
  Members,
  SortKey,
  TableKind,
  TableOptions,
  TableRow,
  Volume,
  buildRows,
  defaultOptions,
  formatTableNumber,
  isStale,
  natureRunePrice,
  viewRows,
} from './price-table';

/** Rows shown at first: all the server renders and transfers */
const INITIAL_ROWS = 25;
/** Rows "Show 50 more" adds */
const MORE_ROWS = 50;

/** What the server hands the browser: the default view's first page, as the lists themselves are about 1.6 MB */
interface TableView {
  rows: TableRow[];
  /** Rows that pass the filters, shown or not */
  total: number;
  /** High alch: the nature rune's price on the picked side */
  natureRune: number;
  /** When the lists were loaded, in ms: the age of a price counts from here */
  loadedAt: number;
}

interface Column {
  key: SortKey;
  label: string;
  tip: string;
}

/**
 * High-alch profit or Margins (`kind`, from the route): every item at the latest prices, sortable and filtered.
 *
 * The server renders the default view's first 25 rows from its copies of the Wiki's lists and transfers only those, so
 * hydration fetches nothing. The browser loads the lists on the first change of a control (or straight away after a
 * client-side navigation, or when the server's render failed), and from then on works out every view itself.
 */
@Component({
  selector: 'price-table-page',
  templateUrl: './price-table-page.html',
  imports: [DecimalPipe, RouterLink, Glyph, Icon, InfoTooltip, LoadError, Segmented, Skeleton, Tooltip],
})
export default class PriceTablePage {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly osrsPricesRepo = inject(OsrsPricesRepo);
  private readonly transferState = inject(TransferState);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

  readonly kind = input.required<TableKind>();

  readonly options = linkedSignal(() => defaultOptions(this.kind()));
  /** Back to the first page whenever the options change */
  readonly shown = linkedSignal({ source: this.options, computation: () => INITIAL_ROWS });
  /** Browser only: whether the lists are needed, once a control has changed or nothing was transferred */
  private readonly interacted = signal(false);

  private readonly stateKey = computed(() => makeStateKey<TableView>(`price-table-${this.kind()}`));
  /** Read once, on the first render: removed afterwards, so a later visit loads the lists */
  private readonly transferred = computed(() => (this.isServer ? null : this.transferState.get(this.stateKey(), null)));

  /**
   * Its own `computed`: `resource` reloads whenever a signal its `params` reads changes, even to the same params, so
   * `interacted` turning true after the lists loaded would load them again
   */
  private readonly listsNeeded = computed(() => this.isServer || this.interacted() || !this.transferred());

  readonly lists = rxResource({
    params: () => (this.listsNeeded() ? this.kind() : undefined),
    stream: ({ params: kind }) =>
      forkJoin({
        mapping: this.osrsPricesRepo.getItemMapping(),
        latest: this.osrsPricesRepo.getAllLatestPrices(),
        day: this.osrsPricesRepo.getAveragePrices(TimeSpan.DAY, yesterdayStart()),
      }).pipe(
        map(lists => {
          // A failed load, not a table without High alch's rune price
          natureRunePrice(lists.latest, 'instant-buy');
          natureRunePrice(lists.latest, 'instant-sell');
          return { ...lists, loadedAt: Date.now() };
        }),
        tap(lists => {
          if (!this.isServer) return;
          const options = defaultOptions(kind);
          const rows = buildRows(kind, options.buyAt, lists.mapping, lists.latest, lists.day);
          this.transferState.set(
            this.stateKey(),
            this.toView(viewRows(rows, options, lists.loadedAt), lists, options, INITIAL_ROWS),
          );
        }),
      ),
  });

  private readonly buyAt = computed(() => this.options().buyAt);
  private readonly rows = computed(() => {
    if (!this.lists.hasValue()) return null;
    const { mapping, latest, day } = this.lists.value();
    return buildRows(this.kind(), this.buyAt(), mapping, latest, day);
  });

  /** The rows to show: from the lists once loaded, else the server's; `null` while there are neither */
  readonly view = computed((): TableView | null => {
    const rows = this.rows();
    if (!rows || !this.lists.hasValue()) return this.transferred();
    const lists = this.lists.value();
    const options = this.options();
    return this.toView(viewRows(rows, options, lists.loadedAt), lists, options, this.shown());
  });

  /** On the server a failed load renders as loading, and the browser loads the lists itself */
  readonly failed = computed(() => !this.isServer && !!this.lists.error());

  readonly isHighAlch = computed(() => this.kind() === 'high-alch');
  readonly title = computed(() => (this.isHighAlch() ? 'High-alch profit' : 'Margins'));
  readonly query = computed(() => this.options().query.trim());

  readonly columns = computed((): Column[] => {
    const limit = { key: 'limit', label: 'Buy limit', tip: 'How many you can buy every 4 hours' } as const;
    const volume = { key: 'volume', label: 'Daily volume', tip: 'Trades yesterday (UTC)' } as const;
    if (this.isHighAlch()) {
      const rune = this.view()?.natureRune;
      return [
        {
          key: 'buy',
          label: 'Buy price',
          tip:
            this.buyAt() === 'instant-buy'
              ? 'The instant-buy price: what the item costs now'
              : 'The instant-sell price: what a buy offer pays once it fills',
        },
        { key: 'alch', label: 'Alch value', tip: 'Coins from High Level Alchemy' },
        {
          key: 'key',
          label: 'Profit',
          tip: `Alch value, minus the buy price and a nature rune${rune ? ` (${formatWhole(rune)} gp)` : ''}`,
        },
        limit,
        { key: 'perLimit', label: 'Per limit', tip: 'The profit on a full buy limit' },
        volume,
      ];
    }
    return [
      { key: 'buy', label: 'Buy at', tip: 'The instant-sell price: an offer at it buys from sellers' },
      { key: 'sell', label: 'Sell at', tip: 'The instant-buy price: an offer at it sells to buyers' },
      {
        key: 'key',
        label: 'Margin',
        tip: 'Sell at, minus buy at and the GE tax: 2% of the sell price, rounded down, at most 5M. Some items pay none',
      },
      limit,
      { key: 'perLimit', label: 'Per limit', tip: 'The margin on a full buy limit' },
      volume,
    ];
  });

  readonly memberOptions: SegmentedOption<Members>[] = [
    { value: 'all', label: 'All items' },
    { value: 'members', label: 'Members' },
    { value: 'f2p', label: 'Free-to-play' },
  ];
  readonly volumeOptions: { value: Volume; label: string }[] = [
    { value: 'any', label: 'Any' },
    { value: 100, label: '100+ a day' },
    { value: 1000, label: '1,000+ a day' },
    { value: 10000, label: '10,000+ a day' },
  ];
  readonly buyAtOptions: { value: BuyAt; label: string }[] = [
    { value: 'instant-buy', label: 'Instant buy' },
    { value: 'instant-sell', label: 'Instant sell' },
  ];

  /** Name bar widths, varied per row so the skeleton rows don't look like a barcode */
  readonly skeletons = ['w-40', 'w-30', 'w-46', 'w-34', 'w-26', 'w-38', 'w-32', 'w-44', 'w-28', 'w-36'];

  protected readonly formatWhole = formatWhole;
  protected readonly formatTableNumber = formatTableNumber;
  protected readonly isGeTaxExempt = isGeTaxExempt;

  constructor() {
    afterNextRender(() => this.transferState.remove(this.stateKey()));
  }

  /** Any change to the view: the browser loads the lists, if it hasn't yet */
  setOptions(changes: Partial<TableOptions>): void {
    this.interacted.set(true);
    this.options.update(options => ({ ...options, ...changes }));
  }

  pickMembers(members: Members): void {
    this.setOptions({ members });
    this.analyticsService.trackOption('price_table_members', members);
  }

  pickVolume(value: string): void {
    const volume = value === 'any' ? 'any' : (Number(value) as Volume);
    this.setOptions({ volume });
    this.analyticsService.trackOption('price_table_volume', volume);
  }

  pickBuyAt(buyAt: BuyAt): void {
    this.setOptions({ buyAt });
    this.analyticsService.trackOption('price_table_buy_at', buyAt);
  }

  /** A header click: highest first, and a second click reverses the order */
  sortBy(sort: SortKey, toggle = true): void {
    const { sort: current, dir } = this.options();
    this.setOptions(toggle && sort === current ? { dir: dir === 'desc' ? 'asc' : 'desc' } : { sort, dir: 'desc' });
    this.analyticsService.trackOption('price_table_sort', sort);
  }

  showMore(): void {
    this.interacted.set(true);
    // Before the lists load, this shows the server's rows; once they arrive, 75
    this.shown.update(shown => shown + MORE_ROWS);
  }

  /** Sorted columns stay on every width; Buy limit hides below 1024px, the rest but the key column on phones */
  columnClass(key: SortKey): string {
    const sorted = key === this.options().sort;
    return (key === 'limit' && !sorted ? 'max-lg:hidden ' : '') + (key === 'key' || sorted ? '' : 'max-sm:hidden');
  }

  /** The price's age, shown with a clock when Any volume lets an old price in */
  staleFor(row: TableRow, view: TableView): string | null {
    return this.options().volume === 'any' && isStale(row, view.loadedAt)
      ? formatDistanceStrict(row.tradedAt, view.loadedAt)
      : null;
  }

  private toView(
    rows: TableRow[],
    lists: { latest: LatestPriceList; loadedAt: number },
    options: TableOptions,
    shown: number,
  ): TableView {
    return {
      rows: rows.slice(0, shown),
      total: rows.length,
      natureRune: natureRunePrice(lists.latest, options.buyAt),
      loadedAt: lists.loadedAt,
    };
  }
}
