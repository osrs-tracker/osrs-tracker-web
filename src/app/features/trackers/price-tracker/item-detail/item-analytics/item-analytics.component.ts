import { DecimalPipe } from '@angular/common';
import { Component, Injector, InputSignal, OnInit, Signal, WritableSignal, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Item } from '@osrs-tracker/models';
import 'chartjs-adapter-date-fns';
import { subDays } from 'date-fns';
import { Observable, forkJoin, map, of, shareReplay } from 'rxjs';
import { CardComponent } from 'src/app/common/components/general/card.component';
import { ColoredValueComponent } from 'src/app/common/components/general/colored-value.component';
import { InfoTooltipComponent } from 'src/app/common/components/general/tooltip/info-tooltip.component';
import { utcStartOfDay } from 'src/app/common/helpers/date.helper';
import {
  AveragePricesAtTime,
  LatestPrices,
  OsrsPricesRepo,
  TimeSpan,
} from 'src/app/common/repositories/osrs-prices.repo';
import { SpinnerComponent } from '../../../../../common/components/general/spinner.component';
import { PriceChartComponent } from './charts/price-chart.component';
import { VolumeChartComponent } from './charts/volume-chart.component';
import { Trend } from './item-analytics.model';

@Component({
  selector: 'item-analytics',
  templateUrl: './item-analytics.component.html',
  imports: [
    DecimalPipe,
    CardComponent,
    ColoredValueComponent,
    InfoTooltipComponent,
    PriceChartComponent,
    VolumeChartComponent,
    SpinnerComponent,
  ],
})
export class ItemAnalyticsComponent implements OnInit {
  private readonly injector = inject(Injector);
  private readonly osrsPricesRepo = inject(OsrsPricesRepo);

  readonly TimeSpan = TimeSpan;
  timeSeriesMap$: { [key in TimeSpan]: Observable<AveragePricesAtTime[]> };

  priceTimeSpan: TimeSpan = TimeSpan.FIVE_MINUTES;
  readonly priceTimeSeries: WritableSignal<AveragePricesAtTime[]> = signal([]);
  volumeTimeSpan: TimeSpan = TimeSpan.FIVE_MINUTES;
  readonly volumeTimeSeries: WritableSignal<AveragePricesAtTime[]> = signal([]);

  readonly itemDetail: InputSignal<Item> = input.required();
  readonly latestPrices: InputSignal<LatestPrices> = input.required();
  readonly timeSeriesToday: InputSignal<AveragePricesAtTime[]> = input.required();

  trend: Signal<Trend | undefined>;

  ngOnInit(): void {
    this.timeSeriesMap$ = {
      [TimeSpan.FIVE_MINUTES]: of(this.timeSeriesToday()),
      [TimeSpan.HOUR]: this.osrsPricesRepo.getPriceTimeSeries(this.itemDetail().id, TimeSpan.HOUR).pipe(shareReplay(1)),
      [TimeSpan.SIX_HOURS]: this.osrsPricesRepo
        .getPriceTimeSeries(this.itemDetail().id, TimeSpan.SIX_HOURS)
        .pipe(shareReplay(1)),
      [TimeSpan.DAY]: this.osrsPricesRepo.getPriceTimeSeries(this.itemDetail().id, TimeSpan.DAY).pipe(shareReplay(1)),
    };

    this.initTrends();
    this.updatePrice(this.priceTimeSpan);
    this.updateVolume(this.volumeTimeSpan);
  }

  private initTrends(): void {
    this.trend = toSignal(
      forkJoin(
        [90, 30, 7, 1].map(days =>
          this.osrsPricesRepo.getCachedPriceAverage(
            this.itemDetail().id,
            TimeSpan.DAY,
            utcStartOfDay(subDays(new Date(), days)),
          ),
        ),
      ).pipe(
        map(([quarter, month, week, day]) => ({
          quarter: this.trendDiff(this.latestPrices().low, quarter.averagePrices?.avgLowPrice),
          quarterValue: quarter.averagePrices?.avgLowPrice,

          month: this.trendDiff(this.latestPrices().low, month.averagePrices?.avgLowPrice),
          monthValue: month.averagePrices?.avgLowPrice,

          week: this.trendDiff(this.latestPrices().low, week.averagePrices?.avgLowPrice),
          weekValue: week.averagePrices?.avgLowPrice,

          today: this.trendDiff(this.latestPrices().low, day.averagePrices?.avgLowPrice),
          todayValue: day.averagePrices?.avgLowPrice,
        })),
      ),
      { injector: this.injector },
    );
  }

  updatePrice(timeSpan: TimeSpan): void {
    this.priceTimeSpan = timeSpan;
    this.timeSeriesMap$[timeSpan].subscribe(priceTimeSeries => this.priceTimeSeries.set(priceTimeSeries));
  }

  updateVolume(timeSpan: TimeSpan): void {
    this.volumeTimeSpan = timeSpan;
    this.timeSeriesMap$[timeSpan].subscribe(priceTimeSeries => this.volumeTimeSeries.set(priceTimeSeries));
  }

  private trendDiff(value: number, base?: number): number {
    return base ? ((value - base) / base) * 100 : 0;
  }
}
