import { formatNumber } from '@angular/common';
import {
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
import { Chart, LineController, LineElement, LinearScale, PointElement, TimeSeriesScale, Tooltip } from 'chart.js';
import { fromUnixTime } from 'date-fns';
import { formatNumberLegible } from 'src/app/common/helpers/number.helper';
import { ThemeService } from 'src/app/common/services/theme.service';
import { AveragePricesAtTime } from 'src/app/repositories/osrs-prices.repo';
import { config } from 'src/config/config';

@Component({
  standalone: true,
  selector: 'price-chart',
  template: '<canvas #priceChart class="h-44 max-w-full"></canvas>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceChartComponent implements OnInit, OnDestroy {
  priceChart: Chart;
  @ViewChild('priceChart', { static: true }) priceChartCanvas: ElementRef<HTMLCanvasElement>;

  @Input({ required: true }) timeSeries: Signal<AveragePricesAtTime[]>;

  get chartConfig() {
    return this.themeService.darkMode() ? config.chart.dark : config.chart.light;
  }

  constructor(private injector: Injector, private themeService: ThemeService) {}

  ngOnInit(): void {
    Chart.register(LineController, LineElement, PointElement, LinearScale, TimeSeriesScale, Tooltip);

    this.createPriceChart();

    effect(() => this.updatePriceChart(this.timeSeries()), { injector: this.injector });
    effect(() => this.themeService.darkMode() && this.priceChart.update(), { injector: this.injector });
  }

  ngOnDestroy(): void {
    this.priceChart?.destroy();

    Chart.unregister(LineController, LineElement, PointElement, LinearScale, TimeSeriesScale, Tooltip);
  }

  private createPriceChart(): void {
    this.priceChart = new Chart(this.priceChartCanvas.nativeElement, {
      type: 'line',
      data: { datasets: [] },
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
              color: () => this.chartConfig.tickColor,
              source: 'data',
              maxRotation: 0,
              includeBounds: false,
              stepSize: 3,
            },
            grid: { color: () => this.chartConfig.gridColor },
          },
          y: {
            type: 'linear',
            ticks: {
              color: () => this.chartConfig.tickColor,
              autoSkipPadding: 20,
              includeBounds: false,
              callback: value => formatNumberLegible(Number(value), 3),
            },
            grid: { color: () => this.chartConfig.gridColor },
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
              label: context => ` ${context.dataset.label}: ${formatNumber(context.parsed.y, 'en-US', '1.0-0')} gp`,
            },
          },
        },
      },
    });
  }

  private updatePriceChart(priceTimeSeries: AveragePricesAtTime[]) {
    this.priceChart.data.datasets = [
      {
        label: 'Buy price',
        data: priceTimeSeries.map(price => ({
          x: fromUnixTime(price.timestamp).getTime(),
          y: price.avgHighPrice,
        })),
        borderColor: this.chartConfig.buyColor,
        backgroundColor: this.chartConfig.buyColor,
      },
      {
        label: 'Sell price',
        data: priceTimeSeries.map(price => ({
          x: fromUnixTime(price.timestamp).getTime(),
          y: price.avgLowPrice,
        })),
        borderColor: this.chartConfig.sellColor,
        backgroundColor: this.chartConfig.sellColor,
      },
    ];

    this.priceChart.update();
  }
}