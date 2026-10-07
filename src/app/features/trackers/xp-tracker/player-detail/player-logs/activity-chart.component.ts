import { formatNumber } from '@angular/common';
import { DOCUMENT, Component, computed, inject, input, InputSignal, Signal } from '@angular/core';
import { Chart, ChartOptions, Point } from 'chart.js';
import { merge } from 'chart.js/helpers';
import { BaseChart } from 'src/app/common/components/charts/base-chart';
import { LOCAL_ICONS } from 'src/app/common/directives/icon/local-icons.token';
import { ACTIVITY_COLORS, ChartActivity } from '../../activity-colors';
import { Gains } from '../player-summary';
import { ActivityView, PlayerView } from '../player-view';
import { CHART_CATEGORIES } from './chart-categories';
import { ChartLegendComponent, LegendItem } from './chart-legend.component';
import { logChartOptions } from './log-chart-options';
import { activitySeries, ChartSeries } from './log-chart-series';
import { TooltipMarkers } from './tooltip-markers';

/** The activities with the largest totals get a chip; the rest wait behind "+N" */
const CHIPS_SHOWN = 8;

/**
 * Daily scores of one activity category as stacked bars over the period: the activities the page doesn't hide, or for
 * minigames the one picked, as their units differ too much to stack. Takes the daily diffs, newest first.
 */
@Component({
  selector: 'activity-chart',
  template: `
    <div class="relative h-55 lg:h-auto lg:grow lg:min-h-35">
      <canvas #chart [class.invisible]="!series().length"></canvas>
      @if (!series().length) {
        <p class="absolute inset-0 flex items-center justify-center px-4 text-center text-base text-muted">
          {{
            category() === 'minigames' ? 'No minigame totals gained in these days.' : 'Nothing gained in these days.'
          }}
        </p>
      }
    </div>
    @if (legendItems().length) {
      <chart-legend
        class="block mt-4"
        kind="activity"
        prefix="+"
        [items]="legendItems()"
        [collapseAfter]="CHIPS_SHOWN"
        (toggled)="toggle($event)"
      />
    }
  `,
  host: { class: 'flex flex-col grow min-h-0' },
  imports: [ChartLegendComponent],
})
export class ActivityChartComponent extends BaseChart<'bar', Gains[]> {
  protected readonly type = 'bar';

  private readonly playerView = inject(PlayerView);

  readonly CHIPS_SHOWN = CHIPS_SHOWN;

  readonly #markers = new TooltipMarkers(inject(DOCUMENT), 'activity', inject(LOCAL_ICONS, { optional: true }));

  readonly category: InputSignal<ActivityView> = input.required();
  /** The charted minigame */
  readonly minigame: InputSignal<string | undefined> = input();

  /** Every activity of the category with gains */
  readonly #allSeries: Signal<ChartSeries[]> = computed(() =>
    activitySeries(this.data(), CHART_CATEGORIES[this.category()]),
  );
  /** The ones shown */
  readonly series: Signal<ChartSeries[]> = computed(() => this.#allSeries().filter(({ name }) => !this.hidden(name)));
  readonly legendItems: Signal<LegendItem[]> = computed(() =>
    this.#allSeries().map(series => ({
      name: series.name,
      color: this.color(series.name),
      total: series.total,
      on: !this.hidden(series.name),
    })),
  );

  /** Picks a minigame, or toggles an activity of the other categories */
  toggle(name: string): void {
    this.playerView.pickActivity(this.category(), name);
  }

  private hidden(name: string): boolean {
    return this.category() === 'minigames' ? name !== this.minigame() : this.playerView.hidden().has(name);
  }

  private color(name: string): string {
    return ACTIVITY_COLORS[name as ChartActivity][this.darkMode() ? 'dark' : 'light'];
  }

  protected chartOptions(): ChartOptions<'bar'> {
    return merge(logChartOptions<'bar'>(this.#markers), {
      datasets: {
        bar: { borderRadius: 2, maxBarThickness: 32, borderSkipped: false },
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true, ticks: { precision: 0 } },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: context => `${context.dataset.label}: ${formatNumber(context.parsed.y!, 'en-US', '1.0-0')}`,
          },
        },
      },
    } satisfies ChartOptions<'bar'>);
  }

  protected setData(chart: Chart<'bar', Point[]>): void {
    chart.data.datasets = this.series().map(series => ({
      label: series.name,
      data: series.points.map(point => ({ ...point, y: point.y || null })) as Point[],
      borderColor: this.color(series.name),
      backgroundColor: this.color(series.name),
    }));
  }
}
