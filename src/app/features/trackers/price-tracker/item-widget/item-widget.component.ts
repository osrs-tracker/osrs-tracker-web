import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { subDays } from 'date-fns';
import { forkJoin } from 'rxjs';
import { trackChanges } from 'src/app/core/decorators/track-changes.decorator';
import { utcStartOfDay } from 'src/app/core/helpers/date.helper';
import { OsrsPricesRepo, TimeSpan } from 'src/app/services/repositories/osrs-prices.repo';
import { RecentItem } from '../price-tracker.service';

@UntilDestroy()
@Component({
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
        <spinner *ngIf="loading; else content"></spinner>
        <ng-template #content><colored-value [value]="trend" suffix="gp"></colored-value></ng-template>
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemWidgetComponent implements OnInit {
  @trackChanges loading = true;

  @Input() recentItem: RecentItem;

  trend: number | null;

  constructor(public cdRef: ChangeDetectorRef, private osrsPricesRepo: OsrsPricesRepo) {}

  ngOnInit(): void {
    forkJoin([
      this.osrsPricesRepo.getLatestPrices(this.recentItem.id, { fetchAll: true }), // fetch all to share the request with other widgets due to the share-request.interceptor
      this.osrsPricesRepo.getCachedPriceAverage(
        this.recentItem.id,
        TimeSpan.DAY,
        utcStartOfDay(subDays(new Date(), 1)),
      ),
    ])
      .pipe(untilDestroyed(this))
      .subscribe(([latest, recent]) => {
        if (latest.low === null || recent.averagePrices?.avgLowPrice == null) this.trend = null;
        else this.trend = latest.low - recent.averagePrices.avgLowPrice;

        this.loading = false;
      });
  }
}
