import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, Input, OnInit, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Item } from '@osrs-tracker/models';
import { subDays } from 'date-fns';
import { forkJoin, map } from 'rxjs';
import { CardComponent } from 'src/app/common/components/card.component';
import { ColoredValueComponent } from 'src/app/common/components/colored-value.component';
import { InfoTooltipComponent } from 'src/app/common/components/tooltip/info-tooltip.component';
import { utcStartOfDay } from 'src/app/common/helpers/date.helper';
import { LatestPrices, OsrsPricesRepo, TimeSpan } from 'src/app/common/services/repositories/osrs-prices.repo';
import { Trend } from './item-analytics.model';

@Component({
  standalone: true,
  selector: 'item-analytics',
  templateUrl: './item-analytics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, CardComponent, ColoredValueComponent, InfoTooltipComponent],
})
export class ItemAnalyticsComponent implements OnInit {
  @Input() itemDetail: Item;
  @Input() latestPrices: LatestPrices;

  trend: Signal<Trend | undefined>;

  constructor(private injector: Injector, private osrsPricesRepo: OsrsPricesRepo) {}

  ngOnInit(): void {
    this.initTrends();
    this.initPriceHistory();
    this.initVolumeHistory();
  }

  private initTrends(): void {
    this.trend = toSignal(
      forkJoin(
        [90, 30, 7, 1].map(days =>
          this.osrsPricesRepo.getCachedPriceAverage(
            this.itemDetail.id,
            TimeSpan.DAY,
            utcStartOfDay(subDays(new Date(), days)),
          ),
        ),
      ).pipe(
        map(([quarter, month, week, day]) => ({
          quarter: this.trendDiff(this.latestPrices.low, quarter.averagePrices?.avgLowPrice),
          quarterValue: quarter.averagePrices?.avgLowPrice,

          month: this.trendDiff(this.latestPrices.low, month.averagePrices?.avgLowPrice),
          monthValue: month.averagePrices?.avgLowPrice,

          week: this.trendDiff(this.latestPrices.low, week.averagePrices?.avgLowPrice),
          weekValue: week.averagePrices?.avgLowPrice,

          today: this.trendDiff(this.latestPrices.low, day.averagePrices?.avgLowPrice),
          todayValue: day.averagePrices?.avgLowPrice,
        })),
      ),
      { injector: this.injector },
    );
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
