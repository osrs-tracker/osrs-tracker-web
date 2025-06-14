import { Component, InputSignal, OnInit, WritableSignal, inject, input, signal } from '@angular/core';
import { subDays } from 'date-fns';
import { forkJoin, map } from 'rxjs';
import { ColoredValueComponent } from 'src/app/common/components/general/colored-value.component';
import { SpinnerComponent } from 'src/app/common/components/general/spinner.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { utcStartOfDay } from 'src/app/common/helpers/date.helper';
import { OsrsPricesRepo, TimeSpan } from 'src/app/common/repositories/osrs-prices.repo';
import { RecentItem } from '../price-tracker-storage.service';

@Component({
  selector: 'item-widget',
  template: `
    <article
      class="flex rounded text-lg font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white
        cursor-pointer ring-2 ring-transparent hover:ring-emerald-500 dark:hover:ring-emerald-400"
    >
      <div class="flex-1 flex gap-3 items-center rounded-l bg-slate-300 dark:bg-slate-700 px-4 py-2">
        <img icon [name]="recentItem().icon" [wiki]="true" class="w-7 h-7" />
        <h3 class="truncate" [title]="recentItem().name">{{ recentItem().name }}</h3>
      </div>
      <div class="flex-1 flex items-center justify-end px-4 py-2">
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
          if (latest.low === null || recent.averagePrices?.avgLowPrice == null) return undefined;
          return latest.low - recent.averagePrices.avgLowPrice;
        }),
      )
      .subscribe(trend => {
        this.trend.set(trend);
        this.loading.set(false);
      });
  }
}
