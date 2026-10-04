import { DecimalPipe } from '@angular/common';
import {
  Component,
  InputSignal,
  ResourceRef,
  Signal,
  WritableSignal,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Item } from '@osrs-tracker/models';
import 'chartjs-adapter-date-fns';
import { subDays } from 'date-fns';
import { Observable, forkJoin, map, of, shareReplay } from 'rxjs';
import { CardComponent } from 'src/app/common/components/general/card.component';
import { ColoredValueComponent } from 'src/app/common/components/general/colored-value.component';
import { LoadErrorComponent } from 'src/app/common/components/general/load-error.component';
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
    LoadErrorComponent,
    PriceChartComponent,
    VolumeChartComponent,
    SpinnerComponent,
  ],
})
export class ItemAnalyticsComponent {
  private readonly osrsPricesRepo = inject(OsrsPricesRepo);

  readonly TimeSpan = TimeSpan;

  readonly priceTimeSpan: WritableSignal<TimeSpan> = signal(TimeSpan.FIVE_MINUTES);
  readonly volumeTimeSpan: WritableSignal<TimeSpan> = signal(TimeSpan.FIVE_MINUTES);

  readonly itemDetail: InputSignal<Item> = input.required();
  readonly latestPrices: InputSignal<LatestPrices> = input.required();
  readonly timeSeriesToday: InputSignal<AveragePricesAtTime[]> = input.required();

  /** Shared per item, so switching back and forth between time spans doesn't refetch. */
  private readonly timeSeriesMap: Signal<Record<TimeSpan, Observable<AveragePricesAtTime[]>>> = computed(() => {
    const id = this.itemDetail().id;
    return {
      [TimeSpan.FIVE_MINUTES]: of(this.timeSeriesToday()),
      [TimeSpan.HOUR]: this.osrsPricesRepo.getPriceTimeSeries(id, TimeSpan.HOUR).pipe(shareReplay(1)),
      [TimeSpan.SIX_HOURS]: this.osrsPricesRepo.getPriceTimeSeries(id, TimeSpan.SIX_HOURS).pipe(shareReplay(1)),
      [TimeSpan.DAY]: this.osrsPricesRepo.getPriceTimeSeries(id, TimeSpan.DAY).pipe(shareReplay(1)),
    };
  });

  // Resources cancel the previous request when the time span changes, so a slow response can't overwrite a newer one.
  readonly priceTimeSeries: ResourceRef<AveragePricesAtTime[]> = rxResource({
    params: () => this.timeSeriesMap()[this.priceTimeSpan()],
    stream: ({ params: timeSeries$ }) => timeSeries$,
    defaultValue: [],
  });
  readonly volumeTimeSeries: ResourceRef<AveragePricesAtTime[]> = rxResource({
    params: () => this.timeSeriesMap()[this.volumeTimeSpan()],
    stream: ({ params: timeSeries$ }) => timeSeries$,
    defaultValue: [],
  });

  readonly trend: ResourceRef<Trend | undefined> = rxResource({
    params: () => ({ id: this.itemDetail().id, latestLow: this.latestPrices().low }),
    stream: ({ params: { id, latestLow } }) =>
      forkJoin(
        [90, 30, 7, 1].map(days =>
          this.osrsPricesRepo.getCachedPriceAverage(id, TimeSpan.DAY, utcStartOfDay(subDays(new Date(), days))),
        ),
      ).pipe(
        map(([quarter, month, week, day]) => ({
          quarter: this.trendDiff(latestLow, quarter.averagePrices?.avgLowPrice),
          quarterValue: quarter.averagePrices?.avgLowPrice,

          month: this.trendDiff(latestLow, month.averagePrices?.avgLowPrice),
          monthValue: month.averagePrices?.avgLowPrice,

          week: this.trendDiff(latestLow, week.averagePrices?.avgLowPrice),
          weekValue: week.averagePrices?.avgLowPrice,

          today: this.trendDiff(latestLow, day.averagePrices?.avgLowPrice),
          todayValue: day.averagePrices?.avgLowPrice,
        })),
      ),
  });

  private trendDiff(value: number, base?: number): number {
    return base ? ((value - base) / base) * 100 : 0;
  }
}
