import { BreakpointObserver } from '@angular/cdk/layout';
import { isPlatformBrowser } from '@angular/common';
import {
  Directive,
  ElementRef,
  HostListener,
  Injector,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  effect,
  inject,
  input,
  runInInjectionContext,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Chart, ChartOptions, Point } from 'chart.js';
import { merge } from 'chart.js/helpers';
import { map } from 'rxjs';
import { ThemeStore } from '@app/common/theme/theme-store';
import './chart-setup';

/** A change between two states of the data: short, as periods and skills are switched often (claude-kb VIZ-026) */
const ANIMATION = { duration: 300 };

/**
 * Lifecycle, workarounds and shared options of the time series charts. Subclasses render `<canvas #chart></canvas>` and
 * only add their chart type, own options and datasets (built from `data`).
 */
@Directive()
export abstract class BaseChart<TType extends 'line' | 'bar', TData> implements OnInit, OnDestroy {
  private readonly injector = inject(Injector);
  private readonly themeStore = inject(ThemeStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  // Chart.js animates regardless of the setting, so the charts follow it themselves (and its changes, without a reload)
  private readonly reducedMotion = toSignal(
    inject(BreakpointObserver)
      .observe('(prefers-reduced-motion: reduce)')
      .pipe(map(state => state.matches)),
    { requireSync: true },
  );

  private chart?: Chart<TType, Point[]>;
  private initFrame?: number;
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('chart');

  readonly data = input.required<TData>();

  protected readonly darkMode = this.themeStore.darkMode;

  protected abstract readonly type: TType;

  /** Options on top of the shared ones, merged deeply */
  protected abstract chartOptions(): ChartOptions<TType>;

  /** Replaces the chart's datasets (and anything else that depends on the data), the chart is redrawn afterwards */
  protected abstract setData(chart: Chart<TType, Point[]>, data: TData): void;

  ngOnInit(): void {
    // In the next frame, a task of its own: creating and drawing a chart is slow, and inside the hydration tick it made
    // that task longer (`afterNextRender` would still run in it)
    if (this.isBrowser) this.initFrame = requestAnimationFrame(() => this.initChart());
  }

  ngOnDestroy(): void {
    if (this.initFrame !== undefined) cancelAnimationFrame(this.initFrame);
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
  hideTooltipOnTap(target: EventTarget | null): void {
    if (target !== this.canvas().nativeElement) this.hideTooltip();
  }

  // Escape closes the hover tooltip (WCAG 1.4.13); moving the pointer opens it again
  @HostListener('document:keydown.escape')
  hideTooltip(): void {
    this.chart?.canvas.dispatchEvent(new Event('mouseout'));
  }

  private initChart(): void {
    this.chart = this.createChart();

    runInInjectionContext(this.injector, () => {
      // Before the data's effect, which it applies to; `false` also turns off the tooltip's movement
      effect(() => (this.chart!.options!.animation = this.reducedMotion() ? false : ANIMATION));
      effect(() => this.updateChart(this.chart!, this.data()));
      // Redraw on a theme change: the colours come from the theme's tokens (chart-setup.ts)
      effect(() => (this.themeStore.darkMode(), this.chart!.update('none')));
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
    const firstData = !chart.data.datasets.length;
    const drawn = new Map(chart.data.datasets.map(dataset => [dataset.label, dataset]));
    this.setData(chart, data);

    // Chart.js recognises a drawn dataset by its object: a new one is drawn again from the axis. A dataset over the same
    // dates (the live hiscores changing the newest day) is updated in place, so only the points that changed move; over
    // other dates (another period) it's drawn again, as its points would otherwise slide across to other dates
    chart.data.datasets = chart.data.datasets.map(dataset => {
      const previous = drawn.get(dataset.label);
      return previous && sameDates(previous.data, dataset.data) ? Object.assign(previous, dataset) : dataset;
    });

    // The first data is drawn at once: growing it in is decoration, while a change animates so it can be followed
    chart.update(firstData ? 'none' : undefined);
  }
}

function sameDates(a: Point[], b: Point[]): boolean {
  return a.length === b.length && a.every((point, i) => point.x === b[i].x);
}
