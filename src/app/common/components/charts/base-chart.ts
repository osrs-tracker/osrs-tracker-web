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
import { Chart, ChartOptions, Point } from 'chart.js';
import { merge } from 'chart.js/helpers';
import { ThemeService } from '@app/common/services/theme-service';
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
  private readonly canvas: Signal<ElementRef<HTMLCanvasElement>> = viewChild.required('chart');

  readonly data: InputSignal<TData> = input.required();

  protected readonly darkMode: Signal<boolean> = this.themeService.darkMode;

  protected abstract readonly type: TType;

  /** Options on top of the shared ones, merged deeply */
  protected abstract chartOptions(): ChartOptions<TType>;

  /** Replaces the chart's datasets (and anything else that depends on the data), the chart is redrawn afterwards */
  protected abstract setData(chart: Chart<TType, Point[]>, data: TData): void;

  ngOnInit(): void {
    if (this.isBrowser) this.initChart();
  }

  ngOnDestroy(): void {
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

  private initChart(): void {
    this.chart = this.createChart();

    runInInjectionContext(this.injector, () => {
      effect(() => this.updateChart(this.chart!, this.data()));
      // Redraw on a theme change: the colours come from the theme's tokens (chart-setup.ts)
      effect(() => (this.themeService.darkMode(), this.chart!.update('none')));
    });
  }

  private createChart(): Chart<TType, Point[]> {
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
      },
    };

    return new Chart(this.canvas().nativeElement, {
      type: this.type,
      data: { datasets: [] },
      options: merge(sharedOptions as ChartOptions<TType>, this.chartOptions()),
    });
  }

  private updateChart(chart: Chart<TType, Point[]>, data: TData): void {
    const drawn = new Map(chart.data.datasets.map(dataset => [dataset.label, dataset]));
    this.setData(chart, data);

    // Chart.js recognises a drawn dataset by its object: a new one is drawn again from the axis. A dataset over the same
    // dates (the live hiscores changing the newest day) is updated in place, so only the points that changed move; over
    // other dates (another period) it's drawn again, as its points would otherwise slide across to other dates
    chart.data.datasets = chart.data.datasets.map(dataset => {
      const previous = drawn.get(dataset.label);
      return previous && sameDates(previous.data, dataset.data) ? Object.assign(previous, dataset) : dataset;
    });

    chart.update();
  }
}

function sameDates(a: Point[], b: Point[]): boolean {
  return a.length === b.length && a.every((point, i) => point.x === b[i].x);
}
