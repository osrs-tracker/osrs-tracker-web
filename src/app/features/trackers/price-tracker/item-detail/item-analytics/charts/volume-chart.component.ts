import { formatNumber } from '@angular/common';
import {
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  Injector,
  InputSignal,
  OnDestroy,
  OnInit,
  Signal,
  computed,
  effect,
  input,
  runInInjectionContext,
  viewChild,
} from '@angular/core';
import { BarController, BarElement, Chart, LinearScale, TimeSeriesScale, Tooltip } from 'chart.js';
import Zoom from 'chartjs-plugin-zoom';
import { fromUnixTime } from 'date-fns';
import { formatNumberLegible } from 'src/app/common/helpers/number.helper';
import { AveragePricesAtTime } from 'src/app/common/repositories/osrs-prices.repo';
import { ThemeService } from 'src/app/common/services/theme.service';
import { config } from 'src/config/config';

@Component({
  standalone: true,
  selector: 'volume-chart',
  template: '<canvas #volumeChart></canvas>',
})
export class VolumeChartComponent implements OnInit, OnDestroy {
  @HostBinding('class') class = 'block h-60 max-w-full';

  volumeChart: Chart;
  volumeChartCanvas: Signal<ElementRef<HTMLCanvasElement>> = viewChild.required('volumeChart');

  timeSeries: InputSignal<AveragePricesAtTime[]> = input.required();

  chartConfig = computed(() => (this.themeService.darkMode() ? config.chart.dark : config.chart.light));

  constructor(
    private injector: Injector,
    private themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    Chart.register(BarController, BarElement, LinearScale, TimeSeriesScale, Tooltip, Zoom);

    this.createPriceChart();

    runInInjectionContext(this.injector, () => {
      effect(() => this.updatePriceChart(this.timeSeries()));
      effect(() => (this.themeService.darkMode(), this.volumeChart.update('none')));
    });
  }

  ngOnDestroy(): void {
    this.volumeChart.destroy();

    Chart.unregister(BarController, BarElement, LinearScale, TimeSeriesScale, Tooltip, Zoom);
  }

  // Workaround for chart.js not updating when the size of the canvas shrinks
  @HostListener('window:resize')
  onResize(): void {
    this.volumeChart.resize(1, 1);
    window.requestAnimationFrame(() => this.volumeChart.resize());
  }

  // Workaround for chart.js not closing tooltips when tapping outside the canvas (iOS)
  @HostListener('document:touchend', ['$event.target'])
  hideTooltip(target: HTMLElement): void {
    if (target !== this.volumeChartCanvas().nativeElement) {
      this.volumeChartCanvas().nativeElement.dispatchEvent(new Event('mouseout'));
    }
  }

  private createPriceChart(): void {
    this.volumeChart = new Chart(this.volumeChartCanvas().nativeElement, {
      type: 'bar',
      data: { datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
              color: () => this.chartConfig().tickColor,
              source: 'data',
              maxRotation: 0,
              includeBounds: false,
              stepSize: 3,
            },
            grid: { color: () => this.chartConfig().gridColor, lineWidth: 1 },
          },
          y: {
            type: 'linear',
            stacked: true,
            beginAtZero: true,
            ticks: {
              color: () => this.chartConfig().tickColor,
              autoSkip: false,
              includeBounds: false,
              callback: (value, index, array) => {
                const indexOfZero = array.findIndex(v => v.value === 0);
                const rest = indexOfZero % 2;
                return rest === index % 2 ? formatNumberLegible(Math.abs(Number(value)), 3) : '';
              },
            },
            grid: { color: () => this.chartConfig().gridColor },
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
          zoom: {
            limits: {
              x: { min: 'original', max: 'original' },
              y: { min: 'original', max: 'original' },
            },
            pan: {
              enabled: true,
              threshold: 10,
              mode: 'x',
            },
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              mode: 'x',
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
        borderColor: this.chartConfig().buyColor,
        backgroundColor: this.chartConfig().buyColor,
        stack: 'stack',
      },
      {
        label: 'Sell volume',
        data: priceTimeSeries.map(price => ({
          x: fromUnixTime(price.timestamp).getTime(),
          y: -price.lowPriceVolume,
        })),
        borderColor: this.chartConfig().sellColor,
        backgroundColor: this.chartConfig().sellColor,
        stack: 'stack',
      },
    ];

    this.volumeChart.update();
    this.volumeChart.resetZoom();
  }
}
