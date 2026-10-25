import { formatNumber } from '@angular/common';
import { DOCUMENT, Component, computed, inject, input } from '@angular/core';
import { Chart, ChartOptions, Point } from 'chart.js';
import { merge } from 'chart.js/helpers';
import { BaseChart } from '@app/common/charts/base-chart';
import { ChartTable } from '@app/common/charts/chart-table';
import { ChartDisplay } from '@app/common/charts/chart-display-switch';
import { LOCAL_ICONS } from '@app/common/icon/local-icons-token';
import { chartColors } from '../colors/chart-colors';
import { Gains } from '../player-summary';
import { ActivityView, PlayerView } from '../player-view';
import { CHART_CATEGORIES } from './chart-categories';
import { ChartLegend, LegendItem } from './chart-legend';
import { logChartOptions } from './log-chart-options';
import { activitySeries, logTableRows } from './log-chart-series';
import { TooltipMarkers } from './tooltip-markers';

const CHIPS_SHOWN = 8;

/** Minigames show only the one picked, as their units differ too much to stack. */
@Component({
  selector: 'activity-chart',
  template: `
    <!-- Hidden, not removed, while the table shows: the chart is created once, on its canvas -->
    <div class="relative h-55 lg:h-auto lg:grow lg:min-h-35" [class.hidden]="tableShown()">
      <canvas #chart [class.invisible]="!series().length"></canvas>
      @if (!series().length) {
        <p class="absolute inset-0 flex items-center justify-center px-4 text-center text-base text-muted">
          {{
            category() === 'minigames' ? 'No minigame totals gained in these days.' : 'Nothing gained in these days.'
          }}
        </p>
      }
    </div>
    @if (tableShown()) {
      <chart-table
        class="h-55 lg:h-auto lg:grow lg:min-h-35"
        [caption]="tableCaption()"
        [columns]="tableColumns()"
        [rows]="tableRows()"
      />
    }
    @if (legendItems().length) {
      <chart-legend
        class="mt-4"
        kind="activity"
        prefix="+"
        [items]="legendItems()"
        [collapseAfter]="CHIPS_SHOWN"
        (toggled)="toggle($event)"
      />
    }
  `,
  host: { class: 'flex flex-col grow min-h-0' },
  imports: [ChartLegend, ChartTable],
})
export class ActivityChart extends BaseChart<'bar', Gains[]> {
  protected readonly type = 'bar';

  private readonly playerView = inject(PlayerView);

  readonly CHIPS_SHOWN = CHIPS_SHOWN;

  readonly #markers = new TooltipMarkers(inject(DOCUMENT), 'activity', inject(LOCAL_ICONS, { optional: true }));

  readonly category = input.required<ActivityView>();
  readonly minigame = input<string>();

  readonly #allSeries = computed(() => activitySeries(this.data(), CHART_CATEGORIES[this.category()]));
  readonly #colors = computed(() => chartColors(this.#allSeries(), this.darkMode()));
  readonly series = computed(() => this.#allSeries().filter(({ name }) => !this.hidden(name)));
  readonly legendItems = computed<LegendItem[]>(() =>
    this.#allSeries().map(series => ({
      name: series.name,
      color: this.color(series.name),
      total: series.total,
      on: !this.hidden(series.name),
    })),
  );

  readonly tableCaption = input.required<string>();
  readonly display = input<ChartDisplay>('chart');
  /** The table in the plot's place; with nothing gained, the plot's message stays */
  readonly tableShown = computed(() => this.display() === 'table' && !!this.series().length);
  readonly tableColumns = computed(() => ['Day', ...this.series().map(({ name }) => name)]);
  readonly tableRows = computed(() => logTableRows(this.series()));

  toggle(name: string): void {
    this.playerView.pickActivity(this.category(), name);
  }

  private hidden(name: string): boolean {
    return this.category() === 'minigames' ? name !== this.minigame() : this.playerView.hidden().has(name);
  }

  private color(name: string): string {
    return this.#colors().get(name)!;
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
