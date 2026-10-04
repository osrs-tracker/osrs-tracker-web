import { isPlatformBrowser } from '@angular/common';
import {
  Directive,
  ElementRef,
  HostListener,
  Injector,
  InputSignal,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Signal,
  computed,
  effect,
  inject,
  input,
  runInInjectionContext,
  viewChild,
} from '@angular/core';
import { Chart, ChartOptions, Plugin, Point } from 'chart.js';
import { merge } from 'chart.js/helpers';
import { AveragePricesAtTime } from 'src/app/common/repositories/osrs-prices.repo';
import { ThemeService } from 'src/app/common/services/theme.service';
import { config } from 'src/config/config';
import './chart-setup';

export type ChartColors = typeof config.chart.dark;

/**
 * Lifecycle, workarounds and shared options of the time series charts. Subclasses render `<canvas #chart></canvas>` and
 * only add their chart type, own options and datasets.
 */
@Directive()
export abstract class BaseChart<TType extends 'line' | 'bar'> implements OnInit, OnDestroy {
  private readonly injector = inject(Injector);
  private readonly themeService = inject(ThemeService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  chart?: Chart<TType, Point[]>;
  private destroyed = false;
  private readonly canvas: Signal<ElementRef<HTMLCanvasElement>> = viewChild.required('chart');

  readonly timeSeries: InputSignal<AveragePricesAtTime[]> = input.required();

  protected readonly chartConfig: Signal<ChartColors> = computed(() =>
    this.themeService.darkMode() ? config.chart.dark : config.chart.light,
  );

  protected abstract readonly type: TType;

  /** Options on top of the shared ones, merged deeply */
  protected abstract chartOptions(): ChartOptions<TType>;

  /** Replaces the chart's datasets (and anything else that depends on the data), the chart is redrawn afterwards */
  protected abstract setData(chart: Chart<TType, Point[]>, timeSeries: AveragePricesAtTime[]): void;

  ngOnInit(): void {
    if (this.isBrowser) void this.initChart();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.chart?.destroy();
  }

  // Workaround for chart.js not updating when the size of the canvas shrinks
  @HostListener('window:resize')
  onResize(): void {
    this.chart?.resize(1, 1);
    requestAnimationFrame(() => this.chart?.resize());
  }

  // Workaround for chart.js not closing tooltips when tapping outside the canvas (iOS)
  @HostListener('document:touchend', ['$event.target'])
  hideTooltip(target: EventTarget | null): void {
    if (this.chart && target !== this.canvas().nativeElement) {
      this.canvas().nativeElement.dispatchEvent(new Event('mouseout'));
    }
  }

  private async initChart(): Promise<void> {
    // The zoom plugin is loaded lazily (it needs the browser), so it's passed to the chart instead of registered globally
    const zoom = (await import('chartjs-plugin-zoom')).default;

    // The component can be destroyed while the zoom plugin is loading
    if (this.destroyed) return;

    this.chart = this.createChart([zoom]);

    runInInjectionContext(this.injector, () => {
      effect(() => this.updateChart(this.chart!, this.timeSeries()));
      effect(() => (this.themeService.darkMode(), this.chart!.update('none')));
    });
  }

  private createChart(plugins: Plugin[]): Chart<TType, Point[]> {
    const sharedOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
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
            includeBounds: false,
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
    };

    return new Chart(this.canvas().nativeElement, {
      type: this.type,
      data: { datasets: [] },
      plugins: plugins as Plugin<TType>[],
      options: merge(sharedOptions as ChartOptions<TType>, this.chartOptions()),
    });
  }

  private updateChart(chart: Chart<TType, Point[]>, timeSeries: AveragePricesAtTime[]): void {
    this.setData(chart, timeSeries);

    chart.update();
    chart.resetZoom();
  }
}
