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
  inject,
  input,
  runInInjectionContext,
  viewChild,
} from '@angular/core';
import { Chart, LineController, LineElement, LinearScale, PointElement, TimeSeriesScale, Tooltip } from 'chart.js';
import Annotation from 'chartjs-plugin-annotation';
import Zoom from 'chartjs-plugin-zoom';
import { fromUnixTime } from 'date-fns';
import { formatNumberLegible } from 'src/app/common/helpers/number.helper';
import { AveragePricesAtTime } from 'src/app/common/repositories/osrs-prices.repo';
import { ThemeService } from 'src/app/common/services/theme.service';
import { config } from 'src/config/config';

@Component({
  standalone: true,
  selector: 'price-chart',
  template: '<canvas #priceChart></canvas>',
})
export class PriceChartComponent implements OnInit, OnDestroy {
  private readonly injector = inject(Injector);
  private readonly themeService = inject(ThemeService);

  @HostBinding('class') class = 'block h-60 max-w-full';

  priceChart: Chart;
  readonly priceChartCanvas: Signal<ElementRef<HTMLCanvasElement>> = viewChild.required('priceChart');

  readonly timeSeries: InputSignal<AveragePricesAtTime[]> = input.required();
  readonly latestHighPrice: Signal<AveragePricesAtTime> = computed(
    () =>
      this.timeSeries()
        .filter(v => v.avgHighPrice)
        .slice(-1)[0],
  );
  readonly latestLowPrice: Signal<AveragePricesAtTime> = computed(
    () =>
      this.timeSeries()
        .filter(v => v.avgLowPrice)
        .slice(-1)[0],
  );

  readonly chartConfig = computed(() => (this.themeService.darkMode() ? config.chart.dark : config.chart.light));

  ngOnInit(): void {
    Chart.register(LineController, LineElement, PointElement, LinearScale, TimeSeriesScale, Tooltip, Annotation, Zoom);

    this.createPriceChart();

    runInInjectionContext(this.injector, () => {
      effect(() => this.updatePriceChart(this.timeSeries()));
      effect(() => (this.themeService.darkMode(), this.priceChart.update('none')));
    });
  }

  ngOnDestroy(): void {
    this.priceChart.destroy();

    Chart.unregister(
      LineController,
      LineElement,
      PointElement,
      LinearScale,
      TimeSeriesScale,
      Tooltip,
      Annotation,
      Zoom,
    );
  }

  // Workaround for chart.js not updating when the size of the canvas shrinks
  @HostListener('window:resize')
  onResize(): void {
    this.priceChart.resize(1, 1);
    requestAnimationFrame(() => this.priceChart.resize());
  }

  // Workaround for chart.js not closing tooltips when tapping outside the canvas (iOS)
  @HostListener('document:touchend', ['$event.target'])
  hideTooltip(target: HTMLElement): void {
    if (target !== this.priceChartCanvas().nativeElement) {
      this.priceChartCanvas().nativeElement.dispatchEvent(new Event('mouseout'));
    }
  }

  private createPriceChart(): void {
    this.priceChart = new Chart(this.priceChartCanvas().nativeElement, {
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
              color: () => this.chartConfig().tickColor,
              source: 'data',
              maxRotation: 0,
              includeBounds: false,
              stepSize: 3,
            },
            grid: { color: () => this.chartConfig().gridColor },
          },
          y: {
            type: 'linear',
            ticks: {
              color: () => this.chartConfig().tickColor,
              autoSkipPadding: 20,
              includeBounds: false,
              callback: value => formatNumberLegible(Number(value), 3),
            },
            grid: { color: () => this.chartConfig().gridColor },
          },
        },
        hover: {
          mode: 'index',
          intersect: false,
        },
        devicePixelRatio: Math.max(devicePixelRatio, 1.5),
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
    this.priceChart.data.datasets = [
      {
        label: 'Buy price',
        data: priceTimeSeries.map(price => ({
          x: fromUnixTime(price.timestamp).getTime(),
          y: price.avgHighPrice,
        })),
        borderColor: this.chartConfig().buyColor,
        backgroundColor: this.chartConfig().buyColor,
      },
      {
        label: 'Sell price',
        data: priceTimeSeries.map(price => ({
          x: fromUnixTime(price.timestamp).getTime(),
          y: price.avgLowPrice,
        })),
        borderColor: this.chartConfig().sellColor,
        backgroundColor: this.chartConfig().sellColor,
      },
    ];

    this.priceChart.options.plugins!.annotation = {
      annotations: {
        latestBuy: {
          type: 'line',
          yMin: this.latestHighPrice()?.avgHighPrice,
          yMax: this.latestHighPrice()?.avgHighPrice,
          borderColor: this.chartConfig().buyColor,
          borderDash: [5, 5],
          borderDashOffset: 2,
          borderWidth: 1,
        },
        latestSell: {
          type: 'line',
          yMin: this.latestLowPrice()?.avgLowPrice,
          yMax: this.latestLowPrice()?.avgLowPrice,
          borderColor: this.chartConfig().sellColor,
          borderDash: [5, 5],
          borderDashOffset: 2,
          borderWidth: 1,
        },
      },
    };

    this.priceChart.update();
    this.priceChart.resetZoom();
  }
}
