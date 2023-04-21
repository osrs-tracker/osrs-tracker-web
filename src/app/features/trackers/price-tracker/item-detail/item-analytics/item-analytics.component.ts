import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { Item } from '@osrs-tracker/models';
import { subDays } from 'date-fns';
import { forkJoin } from 'rxjs';
import { trackChanges } from 'src/app/core/decorators/track-changes.decorator';
import { utcStartOfDay } from 'src/app/core/helpers/date.helper';
import { LatestPrices, OsrsPricesRepo, TimeSpan } from 'src/app/services/repositories/osrs-prices.repo';
import { Trend } from './item-analytics.model';

@Component({
  selector: 'item-analytics',
  templateUrl: './item-analytics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemAnalyticsComponent implements OnInit {
  @Input() itemDetail: Item;
  @Input() latestPrices: LatestPrices;

  @trackChanges trend?: Trend;

  constructor(protected cdRef: ChangeDetectorRef, private osrsPricesRepo: OsrsPricesRepo) {}

  ngOnInit(): void {
    this.initTrends();
    this.initPriceHistory();
    this.initVolumeHistory();
  }

  private initTrends(): void {
    forkJoin(
      [90, 30, 7, 1].map(days =>
        this.osrsPricesRepo.getCachedPriceAverage(
          this.itemDetail.id,
          TimeSpan.DAY,
          utcStartOfDay(subDays(new Date(), days)),
        ),
      ),
    ).subscribe(([quarter, month, week, day]) => {
      this.trend = {
        quarter: this.trendDiff(this.latestPrices.low, quarter.averagePrices?.avgLowPrice),
        quarterValue: quarter.averagePrices?.avgLowPrice,

        month: this.trendDiff(this.latestPrices.low, month.averagePrices?.avgLowPrice),
        monthValue: month.averagePrices?.avgLowPrice,

        week: this.trendDiff(this.latestPrices.low, week.averagePrices?.avgLowPrice),
        weekValue: week.averagePrices?.avgLowPrice,

        today: this.trendDiff(this.latestPrices.low, day.averagePrices?.avgLowPrice),
        todayValue: day.averagePrices?.avgLowPrice,
      };
    });
  }

  private initPriceHistory(): void {
    //
  }

  private initVolumeHistory(): void {
    //
  }

  private trendDiff(value: number, base?: number): number {
    return base ? ((value - base) / base) * 100 : 0;
  }
}
