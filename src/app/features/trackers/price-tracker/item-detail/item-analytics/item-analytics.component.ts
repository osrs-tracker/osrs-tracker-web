import { DecimalPipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Signal,
  ViewChild,
  effect,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Item } from '@osrs-tracker/models';
import { Chart, LineController, LineElement, LinearScale, PointElement, TimeSeriesScale, Tooltip } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { fromUnixTime, subDays } from 'date-fns';
import { forkJoin, map } from 'rxjs';
import { CardComponent } from 'src/app/common/components/card.component';
import { ColoredValueComponent } from 'src/app/common/components/colored-value.component';
import { InfoTooltipComponent } from 'src/app/common/components/tooltip/info-tooltip.component';
import { utcStartOfDay } from 'src/app/common/helpers/date.helper';
import { ThemeService } from 'src/app/common/services/theme.service';
import { AveragePricesAtTime, LatestPrices, OsrsPricesRepo, TimeSpan } from 'src/app/repositories/osrs-prices.repo';
import { Trend } from './item-analytics.model';

@Component({
  standalone: true,
  selector: 'item-analytics',
  templateUrl: './item-analytics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, CardComponent, ColoredValueComponent, InfoTooltipComponent],
})
export class ItemAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  decimalPipe = new DecimalPipe('en-US');

  @Input() itemDetail: Item;
  @Input() latestPrices: LatestPrices;

  trend: Signal<Trend | undefined>;

  priceChart: Chart;
  @ViewChild('priceChart') priceChartCanvas: ElementRef<HTMLCanvasElement>;

  constructor(private injector: Injector, private osrsPricesRepo: OsrsPricesRepo, private themeService: ThemeService) {
    effect(() => {
      this.themeService.darkMode(); // trigger when darkMode changes
      if (this.priceChart) this.priceChart.update('default');
    });
  }

  ngOnInit(): void {
    Chart.register(LineController, LineElement, PointElement, LinearScale, TimeSeriesScale, Tooltip);

    this.initTrends();
    this.initPriceHistory();
    this.initVolumeHistory();
  }

  ngAfterViewInit(): void {
    this.createPriceChart();
  }

  ngOnDestroy(): void {
    this.priceChart?.destroy();

    Chart.unregister(LineController, LineElement, PointElement, LinearScale, TimeSeriesScale, Tooltip);
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
    this.osrsPricesRepo.getPriceTimeSeries(this.itemDetail.id, TimeSpan.FIVE_MINUTES).subscribe(priceTimeSeries => {
      this.updatePriceChart(priceTimeSeries);
    });
  }

  private initVolumeHistory(): void {
    //
  }

  private trendDiff(value: number, base?: number): number {
    return base ? ((value - base) / base) * 100 : 0;
  }

  private createPriceChart(): void {
    this.priceChart = new Chart(this.priceChartCanvas.nativeElement, {
      type: 'line',
      data: {
        datasets: [],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        datasets: {
          line: {
            pointRadius: 0,
            pointHoverRadius: 4,
            spanGaps: true,
            borderWidth: 2,
          },
        },
        transitions: {
          active: { animation: { duration: 0 } },
        },
        scales: {
          x: {
            type: 'timeseries',
            time: {
              minUnit: 'hour',
              displayFormats: {
                hour: 'HH:mm',
                day: 'MMMM do',
                month: 'MMMM yyyy',
              },
              tooltipFormat: 'MMMM do - HH:mm',
            },
            ticks: {
              color: () => (this.themeService.darkMode() ? '#ffffff' : '#475569'),
              source: 'data',
              maxRotation: 0,
              includeBounds: false,
              stepSize: 3,
            },
            grid: {
              color: () => (this.themeService.darkMode() ? '#475569' : '#cbd5e1'),
            },
          },
          y: {
            type: 'linear',
            grace: '10%',
            ticks: {
              color: () => (this.themeService.darkMode() ? '#ffffff' : '#475569'),
              autoSkipPadding: 20,
              includeBounds: false,
            },
            grid: {
              color: () => (this.themeService.darkMode() ? '#475569' : '#cbd5e1'),
            },
          },
        },
        hover: {
          mode: 'index',
          intersect: false,
        },
        devicePixelRatio: Math.max(window.devicePixelRatio, 1.5),
        plugins: {
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            usePointStyle: true,
            callbacks: {
              label: context =>
                ` ${context.dataset.label}: ${this.decimalPipe.transform(context.parsed.y, '1.0-0')} gp`,
            },
          },
        },
      },
    });
  }

  private updatePriceChart(priceTimeSeries: AveragePricesAtTime[]) {
    this.priceChart.data.datasets = [
      {
        label: 'High price',
        data: priceTimeSeries.map(price => ({
          x: fromUnixTime(price.timestamp).getTime(),
          y: price.avgHighPrice,
        })),
        borderColor: '#f59e0b',
        backgroundColor: '#f59e0b',
      },
      {
        label: 'Low price',
        data: priceTimeSeries.map(price => ({
          x: fromUnixTime(price.timestamp).getTime(),
          y: price.avgLowPrice,
        })),
        borderColor: '#10b981',
        backgroundColor: '#10b981',
      },
    ];
    this.priceChart.update('default');
  }
}
