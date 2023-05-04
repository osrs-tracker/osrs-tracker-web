import { NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
  OnInit,
  Signal,
  WritableSignal,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { subDays } from 'date-fns';
import { forkJoin, map, tap } from 'rxjs';
import { ColoredValueComponent } from 'src/app/common/components/colored-value.component';
import { SpinnerComponent } from 'src/app/common/components/spinner.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { utcStartOfDay } from 'src/app/common/helpers/date.helper';
import { OsrsPricesRepo, TimeSpan } from 'src/app/common/services/repositories/osrs-prices.repo';
import { RecentItem } from '../price-tracker.service';

@Component({
  standalone: true,
  selector: 'item-widget',
  template: `
    <article
      class="flex rounded text-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white
        cursor-pointer ring-2 ring-transparent hover:ring-emerald-500 dark:hover:ring-emerald-400"
    >
      <div class="flex-1 flex gap-3 items-center rounded-l bg-slate-300 dark:bg-slate-700 px-4 py-2">
        <img icon [name]="recentItem.icon" [wiki]="true" class="w-7 h-7" />
        <h3>{{ recentItem.name }}</h3>
      </div>
      <div class="flex-1 flex items-center justify-end px-4 py-2">
        <spinner *ngIf="loading(); else content"></spinner>
        <ng-template #content><colored-value [value]="trend()" suffix="gp"></colored-value></ng-template>
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, IconDirective, ColoredValueComponent, SpinnerComponent],
})
export class ItemWidgetComponent implements OnInit {
  loading: WritableSignal<boolean> = signal(true);
  trend: Signal<number | undefined>;

  @Input() recentItem: RecentItem;

  constructor(private injector: Injector, private osrsPricesRepo: OsrsPricesRepo) {}

  ngOnInit(): void {
    this.trend = toSignal<number | undefined>(
      forkJoin([
        this.osrsPricesRepo.getLatestPrices(this.recentItem.id, { fetchAll: true }), // fetch all to share the request with other widgets due to the share-request.interceptor
        this.osrsPricesRepo.getCachedPriceAverage(
          this.recentItem.id,
          TimeSpan.DAY,
          utcStartOfDay(subDays(new Date(), 1)),
        ),
      ]).pipe(
        map(([latest, recent]) => {
          if (latest.low === null || recent.averagePrices?.avgLowPrice == null) return undefined;
          return latest.low - recent.averagePrices.avgLowPrice;
        }),
        tap(() => this.loading.set(false)),
      ),
      { injector: this.injector },
    );
  }
}
