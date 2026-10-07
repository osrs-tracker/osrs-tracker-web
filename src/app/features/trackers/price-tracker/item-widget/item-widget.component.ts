import {
  Component,
  booleanAttribute,
  InputSignal,
  InputSignalWithTransform,
  OnInit,
  WritableSignal,
  inject,
  input,
  signal,
} from '@angular/core';
import { subDays } from 'date-fns';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ColoredValueComponent } from 'src/app/common/components/general/colored-value.component';
import { SpinnerComponent } from 'src/app/common/components/general/spinner.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { utcStartOfDay } from 'src/app/common/helpers/date.helper';
import { OsrsPricesRepo, TimeSpan } from 'src/app/common/repositories/osrs-prices.repo';
import { RecentItem } from '../price-tracker.store';

@Component({
  selector: 'item-widget',
  template: `
    <article
      class="flex font-bold text-strong cursor-pointer"
      [class]="
        flat()
          ? 'group items-center gap-4 min-h-13 py-3 text-base'
          : 'rounded-2xl text-lg bg-card ring-2 ring-transparent hover:ring-accent'
      "
    >
      <div
        class="flex gap-3 items-center"
        [class]="flat() ? 'min-w-0 flex-1 group-hover:text-accent' : 'w-1/2 rounded-l-2xl bg-row px-4 py-2'"
      >
        <img icon [name]="recentItem().icon" [wiki]="true" class="w-7 h-7" />
        <h3 class="truncate" [title]="recentItem().name">{{ recentItem().name }}</h3>
      </div>
      <div class="flex items-center justify-end" [class]="flat() ? 'shrink-0' : 'w-1/2 px-4 py-2'">
        @if (loading()) {
          <spinner></spinner>
        } @else {
          <colored-value [value]="trend()" suffix="gp"></colored-value>
        }
      </div>
    </article>
  `,
  imports: [IconDirective, ColoredValueComponent, SpinnerComponent],
})
export class ItemWidgetComponent implements OnInit {
  private readonly osrsPricesRepo = inject(OsrsPricesRepo);

  readonly loading: WritableSignal<boolean> = signal(false);
  readonly trend: WritableSignal<number | undefined> = signal(undefined);

  readonly recentItem: InputSignal<RecentItem> = input.required();
  /** A borderless row for lists inside a card, instead of a standalone widget. */
  readonly flat: InputSignalWithTransform<boolean, unknown> = input(false, { transform: booleanAttribute });

  ngOnInit(): void {
    this.fetchPrice();
  }

  fetchPrice(): void {
    this.loading.set(true);

    forkJoin([
      this.osrsPricesRepo.getLatestPrices(this.recentItem().id),
      this.osrsPricesRepo.getCachedPriceAverage(
        this.recentItem().id,
        TimeSpan.DAY,
        utcStartOfDay(subDays(new Date(), 1)),
      ),
    ])
      .pipe(
        map(([latest, recent]) => {
          if (latest.low == null || recent.averagePrices?.avgLowPrice == null) return undefined;
          return latest.low - recent.averagePrices.avgLowPrice;
        }),
        catchError(() => of(undefined)),
      )
      .subscribe(trend => {
        this.trend.set(trend);
        this.loading.set(false);
      });
  }
}
