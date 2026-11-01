import { formatDate, isPlatformServer } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  inject,
  makeStateKey,
  PLATFORM_ID,
  signal,
  TransferState,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LucideTrendingDown, LucideTrendingUp } from '@lucide/angular';
import { forkJoin, map, tap } from 'rxjs';
import { announceChanges } from '@app/common/a11y/announcer';
import { OsrsPricesRepo, TimeSpan } from '@app/common/api/osrs-prices-repo';
import { ListCard, ListCardState } from '@app/common/ui/cards/list-card';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { InfoTooltip } from '@app/common/ui/tooltip/info-tooltip';
import { DAY, yesterdayStart } from '../utc-day';
import { PriceMoverRow } from './price-mover-row';
import { buildPriceMovers, PriceMovers } from './price-movers';

type Direction = keyof PriceMovers;

/** What the server hands the browser: the rows, as the three lists behind them are about 1 MB */
const MOVERS_KEY = makeStateKey<PriceMovers>('price-movers');

/**
 * The server builds the rows from its copies of the Wiki's lists and transfers only those, so hydration fetches nothing.
 * The browser loads the lists after a client-side navigation, or when the server's render failed.
 */
@Component({
  selector: 'price-movers-card',
  template: `
    <section
      list-card
      heading="Yesterday's movers"
      [subtitle]="subtitle"
      kind="item"
      [state]="state()"
      emptyText="No price changes in yet."
      emptyHint="Yesterday's prices come in just after 00:00 UTC."
      errorSource="price-movers"
      errorText="Yesterday's movers didn't load."
      [error]="lists.error()"
      (retry)="lists.reload()"
    >
      <info-tooltip info label="About yesterday's movers">
        <ng-template>
          Each item's average price on one UTC day against the day before, for items worth at least 100 gp with at least
          10M gp traded on both days. New every day. An item's own page compares its latest price with yesterday's
          average instead, so its change can differ.
        </ng-template>
      </info-tooltip>
      <segmented actions label="Direction" [options]="directionOptions" [(value)]="direction" />
      <!-- role="list": Safari drops a list's role when its markers are hidden, and screen readers get the rank from it -->
      <ol class="flex flex-col" role="list">
        @for (mover of rows(); track mover.id; let rank = $index) {
          <li class="flex flex-col">
            <a price-mover-row [routerLink]="['/trackers/price', mover.id]" [mover]="mover" [rank]="rank + 1"></a>
          </li>
        }
      </ol>
    </section>
  `,
  // A grid item doesn't shrink below its content by itself, and the rows' truncated names need it to
  host: { class: 'block min-w-0' },
  imports: [RouterLink, InfoTooltip, ListCard, PriceMoverRow, Segmented],
})
export class PriceMoversCard {
  private readonly osrsPricesRepo = inject(OsrsPricesRepo);
  private readonly transferState = inject(TransferState);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

  readonly directionOptions: SegmentedOption<Direction>[] = [
    { value: 'rising', label: 'Rising', lucide: LucideTrendingUp },
    { value: 'falling', label: 'Falling', lucide: LucideTrendingDown },
  ];
  readonly direction = signal<Direction>('rising');

  readonly subtitle = `Average price change on ${formatDate(yesterdayStart(), 'EEE d MMM', 'en-US', 'UTC')} (UTC)`;

  /** Read once, on the first render: removed afterwards, so a later visit loads the lists */
  private readonly transferred = this.isServer ? null : this.transferState.get(MOVERS_KEY, null);

  readonly lists = rxResource({
    params: () => (this.transferred ? undefined : yesterdayStart()),
    stream: ({ params: yesterday }) =>
      forkJoin({
        mapping: this.osrsPricesRepo.getItemMapping(),
        yesterday: this.osrsPricesRepo.getAveragePrices(TimeSpan.DAY, yesterday),
        dayBefore: this.osrsPricesRepo.getDayBeforeAverages(new Date(yesterday.getTime() - DAY * 1000)),
      }).pipe(
        map(({ mapping, yesterday, dayBefore }) => buildPriceMovers(mapping, yesterday, dayBefore)),
        tap(movers => {
          // Without rows the day's lists aren't in yet: transferred, they'd stop the browser from looking again
          if (this.isServer && movers.rising.length) this.transferState.set(MOVERS_KEY, movers);
        }),
      ),
  });

  private readonly movers = computed(() => this.transferred ?? (this.lists.hasValue() ? this.lists.value() : null));
  readonly rows = computed(() => this.movers()?.[this.direction()] ?? []);

  /** On the server a load that failed or found nothing renders as loading, and the browser loads the lists itself */
  readonly state = computed((): ListCardState => {
    if (this.lists.isLoading() || (this.isServer && !this.rows().length)) return 'loading';
    if (this.lists.error()) return 'error';
    return this.rows().length ? 'ready' : 'empty';
  });

  constructor() {
    afterNextRender(() => this.transferState.remove(MOVERS_KEY));
    announceChanges(() =>
      this.state() === 'ready' ? `Yesterday's biggest ${this.direction() === 'rising' ? 'rises' : 'falls'}.` : null,
    );
  }
}
