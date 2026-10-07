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
  effect,
  inject,
  input,
  runInInjectionContext,
  viewChild,
} from '@angular/core';
import { Chart, ChartOptions, Plugin, Point } from 'chart.js';
import { merge } from 'chart.js/helpers';
import { ThemeService } from 'src/app/common/services/theme.service';
import './chart-setup';

/**
 * Lifecycle, workarounds and shared options of the time series charts. Subclasses render `<canvas #chart></canvas>` and
 * only add their chart type, own options and datasets (built from `data`).
 */
@Directive()
export abstract class BaseChart<TType extends 'line' | 'bar', TData> implements OnInit, OnDestroy {
  private readonly injector = inject(Injector);
  private readonly themeService = inject(ThemeService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private chart?: Chart<TType, Point[]>;
  private destroyed = false;
  private readonly canvas: Signal<ElementRef<HTMLCanvasElement>> = viewChild.required('chart');

  readonly data: InputSignal<TData> = input.required();

  protected readonly darkMode: Signal<boolean> = this.themeService.darkMode;

  protected abstract readonly type: TType;

  /** Options on top of the shared ones, merged deeply */
  protected abstract chartOptions(): ChartOptions<TType>;

  /** Replaces the chart's datasets (and anything else that depends on the data), the chart is redrawn afterwards */
  protected abstract setData(chart: Chart<TType, Point[]>, data: TData): void;

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
      effect(() => this.updateChart(this.chart!, this.data()));
      // Redraw on a theme change: the colours come from the theme's tokens (chart-setup.ts)
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
            source: 'data',
            maxRotation: 0,
            includeBounds: false,
            stepSize: 3,
          },
        },
        y: {
          type: 'linear',
          ticks: {
            includeBounds: false,
          },
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

  private updateChart(chart: Chart<TType, Point[]>, data: TData): void {
    this.setData(chart, data);

    chart.update();
    chart.resetZoom();
  }
}
