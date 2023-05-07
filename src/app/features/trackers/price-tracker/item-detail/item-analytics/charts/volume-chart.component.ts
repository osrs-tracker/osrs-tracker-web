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
import { BarController, BarElement, Chart, LinearScale, TimeSeriesScale, Tooltip } from 'chart.js';
import { fromUnixTime } from 'date-fns';
import { formatNumberLegible } from 'src/app/common/helpers/number.helper';
import { ThemeService } from 'src/app/common/services/theme.service';
import { AveragePricesAtTime } from 'src/app/repositories/osrs-prices.repo';
import { config } from 'src/config/config';

@Component({
  standalone: true,
  selector: 'volume-chart',
  template: '<canvas #volumeChart class="h-44 max-w-full"></canvas>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VolumeChartComponent implements OnInit, OnDestroy {
  volumeChart: Chart;
  @ViewChild('volumeChart', { static: true }) volumeChartCanvas: ElementRef<HTMLCanvasElement>;

  @Input({ required: true }) timeSeries: Signal<AveragePricesAtTime[]>;

  get chartConfig() {
    return this.themeService.darkMode() ? config.chart.dark : config.chart.light;
  }

  constructor(private injector: Injector, private themeService: ThemeService) {}

  ngOnInit(): void {
    Chart.register(BarController, BarElement, LinearScale, TimeSeriesScale, Tooltip);

    this.createPriceChart();

    effect(() => this.updatePriceChart(this.timeSeries()), { injector: this.injector });
    effect(() => this.themeService.darkMode() && this.volumeChart.update(), { injector: this.injector });
  }

  ngOnDestroy(): void {
    this.volumeChart?.destroy();

    Chart.unregister(BarController, BarElement, LinearScale, TimeSeriesScale, Tooltip);
  }

  private createPriceChart(): void {
    this.volumeChart = new Chart(this.volumeChartCanvas.nativeElement, {
      type: 'bar',
      data: { datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        datasets: {
          bar: { barThickness: 2 },
        },
        scales: {
          x: {
            type: 'timeseries',
            stacked: true,
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
            stacked: true,
            beginAtZero: true,
            ticks: {
              color: () => this.chartConfig.tickColor,
              autoSkip: false,
              includeBounds: false,
              callback: (value, index, array) => {
                const indexOfZero = array.findIndex(v => v.value === 0);
                const rest = indexOfZero % 2;
                return rest === index % 2 ? formatNumberLegible(Number(value), 3) : '';
              },
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
              label: context =>
                ` ${context.dataset.label}: ${formatNumber(Math.abs(context.parsed.y), 'en-US', '1.0-0')}`,
            },
          },
        },
      },
    });
  }

  private updatePriceChart(priceTimeSeries: AveragePricesAtTime[]) {
    this.volumeChart.data.datasets = [
      {
        label: 'Buy volume',
        data: priceTimeSeries.map(price => ({
          x: fromUnixTime(price.timestamp).getTime(),
          y: price.highPriceVolume,
        })),
        borderColor: this.chartConfig.buyColor,
        backgroundColor: this.chartConfig.buyColor,
        stack: 'stack',
      },
      {
        label: 'Sell volume',
        data: priceTimeSeries.map(price => ({
          x: fromUnixTime(price.timestamp).getTime(),
          y: -price.lowPriceVolume,
        })),
        borderColor: this.chartConfig.sellColor,
        backgroundColor: this.chartConfig.sellColor,
        stack: 'stack',
      },
    ];

    this.volumeChart.update();
  }
}
