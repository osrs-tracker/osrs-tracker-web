import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin, map } from 'rxjs';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { Icon } from '@app/common/icon/icon';
import { yesterdayStart } from './utc-day';
import { formatNumberLegible, formatPercentChange, formatSign, formatWhole } from '@app/common/format/number-format';
import { OsrsPricesRepo, TimeSpan } from '@app/common/api/osrs-prices-repo';
import { RecentItem } from './price-tracker-store';

interface ItemRowPrice {
  /** The latest instant-sell price. */
  price: number | null;
  /** The price minus the previous day's 24h average (UTC). */
  change: number | null;
  average: number | null;
}

/**
 * A 65px list row linking to an item: icon, name, short price and the change since the previous day's 24h average
 * as a pill.
 */
@Component({
  selector: 'a[item-row]',
  template: `
    <span
      class="flex items-center justify-center size-10 max-sm:size-8 shrink-0 rounded-xl bg-deep border border-line"
      aria-hidden="true"
    >
      <img class="max-w-7.5 max-h-7.5 max-sm:max-w-6 max-sm:max-h-6" icon alt="" [name]="item().icon" [wiki]="true" />
    </span>

    <!-- On phones the price sits beside the change instead, so a row is one line -->
    <span class="flex flex-1 flex-col gap-1 min-w-0">
      <span class="truncate text-lg/5 max-sm:text-base/5 font-bold text-strong" [title]="item().name">{{
        item().name
      }}</span>
      @if (loading()) {
        <skeleton class="max-sm:hidden h-3 w-16 my-0.5" />
      } @else if (priceResource.error()) {
        <span class="max-sm:hidden truncate text-sm/4 text-muted">Couldn't load the price.</span>
      } @else if (price() === null) {
        <span class="max-sm:hidden truncate text-sm/4 text-muted">No recent trades</span>
      } @else {
        <span class="max-sm:hidden text-sm/4 text-muted tabular-nums" [title]="(price() | number) + ' gp'"
          >{{ shortPrice() }} gp</span
        >
      }
    </span>

    @if (loading()) {
      <skeleton class="sm:hidden h-3 w-12" />
      <skeleton class="h-6 w-18 rounded-full" />
    } @else if (priceResource.error()) {
      <load-error compact source="item-row" message="Couldn't load the price." (retry)="priceResource.reload()" />
    } @else {
      @if (price() === null) {
        <span class="sm:hidden shrink-0 text-sm text-muted">No recent trades</span>
      } @else {
        <span class="sm:hidden shrink-0 text-sm text-muted tabular-nums" [title]="(price() | number) + ' gp'"
          >{{ shortPrice() }} gp</span
        >
      }
      @if (change(); as change) {
        <span
          class="shrink-0 min-w-18 px-2.5 py-1 rounded-full text-center text-sm/4 font-bold whitespace-nowrap tabular-nums"
          [class]="
            change.tone === 'up'
              ? 'text-up bg-up/16'
              : change.tone === 'down'
                ? 'text-down bg-down-pill'
                : 'text-muted bg-ground'
          "
          [title]="changeTitle()"
        >
          {{ change.signed }}
        </span>
      } @else {
        <!-- Fills the pill's column, so prices line up on phones, without claiming the price didn't move -->
        <span
          class="shrink-0 min-w-18 px-2.5 py-1 rounded-full text-center text-sm/4 font-bold text-muted bg-ground"
          title="No change to show"
          ><span aria-hidden="true">—</span><span class="sr-only">No change to show</span></span
        >
      }
    }
  `,
  host: {
    class:
      'flex items-center gap-3.5 max-sm:gap-3 px-5 max-sm:px-4 py-3 max-sm:py-2.5 border-b border-row bg-card hover:bg-row focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
  },
  imports: [DecimalPipe, Icon, LoadError, Skeleton],
})
export class ItemRow {
  private readonly osrsPricesRepo = inject(OsrsPricesRepo);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly item = input.required<RecentItem>();

  /**
   * Browser only: `/latest` and `/24h` return every item, and the server would embed both (about 730KB) in the page's
   * transfer state.
   */
  readonly priceResource = rxResource({
    params: () => (this.isBrowser ? { id: this.item().id } : undefined),
    stream: ({ params: { id } }) =>
      forkJoin([
        this.osrsPricesRepo.getLatestPrices(id),
        this.osrsPricesRepo.getCachedPriceAverage(id, TimeSpan.DAY, yesterdayStart()),
      ]).pipe(
        map(([latest, recent]): ItemRowPrice => {
          const price = latest.low ?? null;
          const average = recent.averagePrices?.avgLowPrice ?? null;
          return { price, average, change: price !== null && average !== null ? price - average : null };
        }),
      ),
  });

  // The server renders skeletons, the browser fetches
  readonly loading = computed(() => !this.isBrowser || this.priceResource.isLoading());

  private readonly data = computed(() => (this.priceResource.hasValue() ? (this.priceResource.value() ?? null) : null));

  readonly price = computed(() => this.data()?.price ?? null);
  readonly shortPrice = computed(() => formatNumberLegible(this.price() ?? 0));
  readonly change = computed(() => {
    const { price, average } = this.data() ?? {};
    return price != null && average ? formatPercentChange(price, average) : null;
  });
  // whole gp, as in the game: the average has decimals
  readonly changeTitle = computed(
    () =>
      `${formatSign(this.data()?.change ?? 0, 'exceptZero')}${formatWhole(Math.abs(this.data()?.change ?? 0))} gp vs yesterday's average`,
  );
}
