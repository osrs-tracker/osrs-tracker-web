import { DecimalPipe } from '@angular/common';
import { Component, InputSignal, ResourceRef, Signal, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { subDays } from 'date-fns';
import { forkJoin, map } from 'rxjs';
import { LoadErrorComponent } from 'src/app/common/components/general/load-error.component';
import { SkeletonComponent } from 'src/app/common/components/general/skeleton.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { utcStartOfDay } from 'src/app/common/helpers/date.helper';
import { formatNumberLegible } from 'src/app/common/helpers/number.helper';
import { OsrsPricesRepo, TimeSpan } from 'src/app/common/repositories/osrs-prices.repo';
import { RecentItem } from '../price-tracker.store';

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
      class="flex items-center justify-center size-10 shrink-0 rounded-xl bg-deep border border-line"
      aria-hidden="true"
    >
      <img class="max-w-7.5 max-h-7.5" icon [name]="item().icon" [wiki]="true" />
    </span>

    <span class="flex flex-1 flex-col gap-1 min-w-0">
      <span class="truncate text-lg/5 font-bold text-strong">{{ item().name }}</span>
      @if (priceResource.isLoading()) {
        <skeleton class="h-3 w-16 my-0.5" />
      } @else if (priceResource.error()) {
        <span class="truncate text-sm/4 text-muted">Couldn't load the price.</span>
      } @else if (price() === null) {
        <span class="truncate text-sm/4 text-muted">No recent trades</span>
      } @else {
        <span class="text-sm/4 text-muted tabular-nums" [title]="(price() | number) + ' gp'"
          >{{ shortPrice() }} gp</span
        >
      }
    </span>

    @if (priceResource.isLoading()) {
      <skeleton class="h-6 w-18 rounded-full" />
    } @else if (priceResource.error()) {
      <load-error compact source="item-row" message="Couldn't load the price." (retry)="priceResource.reload()" />
    } @else if (changePercent() !== null) {
      <span
        class="shrink-0 min-w-18 px-2.5 py-1 rounded-full text-center text-sm/4 font-bold whitespace-nowrap tabular-nums"
        [class]="up() ? 'text-up bg-up/16' : 'text-down bg-down/16'"
        [title]="changeTitle()"
      >
        {{ sign() }}{{ changePercent() | number: '1.1-1' }}%
      </span>
    }
  `,
  host: {
    class:
      'flex items-center gap-3.5 px-5 py-3 border-b border-row bg-card hover:bg-row focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
  },
  imports: [DecimalPipe, IconDirective, LoadErrorComponent, SkeletonComponent],
})
export class ItemRowComponent {
  private readonly osrsPricesRepo = inject(OsrsPricesRepo);

  readonly item: InputSignal<RecentItem> = input.required();

  readonly priceResource: ResourceRef<ItemRowPrice | undefined> = rxResource({
    params: () => ({ id: this.item().id }),
    stream: ({ params: { id } }) =>
      forkJoin([
        this.osrsPricesRepo.getLatestPrices(id),
        this.osrsPricesRepo.getCachedPriceAverage(id, TimeSpan.DAY, utcStartOfDay(subDays(new Date(), 1))),
      ]).pipe(
        map(([latest, recent]) => {
          const price = latest.low ?? null;
          const average = recent.averagePrices?.avgLowPrice ?? null;
          return { price, average, change: price !== null && average !== null ? price - average : null };
        }),
      ),
  });

  private readonly data: Signal<ItemRowPrice | null> = computed(() =>
    this.priceResource.hasValue() ? (this.priceResource.value() ?? null) : null,
  );

  readonly price: Signal<number | null> = computed(() => this.data()?.price ?? null);
  readonly shortPrice: Signal<string> = computed(() => formatNumberLegible(this.price() ?? 0));
  readonly up: Signal<boolean> = computed(() => (this.data()?.change ?? 0) >= 0);
  /** The sign as written in the design: a plus or a true minus. */
  readonly sign: Signal<string> = computed(() => (this.up() ? '+' : '−'));
  readonly changePercent: Signal<number | null> = computed(() => {
    const { change, average } = this.data() ?? {};
    return change != null && average ? (Math.abs(change) / average) * 100 : null;
  });
  readonly changeTitle: Signal<string> = computed(
    () => `${this.sign()}${Math.abs(this.data()?.change ?? 0).toLocaleString('en-US')} gp vs yesterday's average`,
  );
}
