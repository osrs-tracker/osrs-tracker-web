import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { trackChanges } from 'src/app/core/decorators/track-changes.decorator';
import { OsrsPricesRepo } from 'src/app/services/repositories/osrs-prices.repo';
import { RecentItem } from '../price-tracker.service';

@Component({
  selector: 'item-widget',
  template: `
    <article
      class="
        flex rounded text-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white
        cursor-pointer ring-2 ring-transparent hover:ring-emerald-500 dark:hover:ring-emerald-400
      "
    >
      <div class="flex-1 flex gap-3 items-center rounded-l bg-slate-300 dark:bg-slate-700 px-4 py-2">
        <img
          icon
          [name]="recentItem.icon"
          [wiki]="true"
          class="w-7 h-7"
        />
        <h3>{{ recentItem.name }}</h3>
      </div>
      <div class="flex-1 flex items-center justify-end px-4 py-2">
        <spinner *ngIf="loading; else content"></spinner>
        <ng-template #content>
          <ng-template [ngIf]="unknown">&mdash;</ng-template>
          <ng-template [ngIf]="!unknown">
            <span [ngClass]="{ 'negative negative--sign': trend < 0, 'positive positive--sign': trend > 0 }">
              {{ absTrend | number }}&ngsp;gp
            </span>
          </ng-template>
        </ng-template>
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemWidgetComponent implements OnInit {
  @trackChanges loading = true;

  @Input() recentItem: RecentItem;

  unknown: boolean;
  trend: number;

  get absTrend(): number {
    return Math.abs(this.trend);
  }

  constructor(public cdRef: ChangeDetectorRef, private osrsPricesRepo: OsrsPricesRepo) {}

  ngOnInit(): void {
    forkJoin([
      this.osrsPricesRepo.getLatestPrices(this.recentItem.id),
      this.osrsPricesRepo.getPreviousDayAverage(this.recentItem.id),
    ]).subscribe(([latest, recent]) => {
      if (latest.low === null || recent.avgLowPrice === null) this.unknown = true;
      this.trend = latest.low - recent.avgLowPrice;

      this.loading = false;
    });
  }
}
