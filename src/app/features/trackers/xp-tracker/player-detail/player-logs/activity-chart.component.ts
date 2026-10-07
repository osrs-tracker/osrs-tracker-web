import { formatNumber } from '@angular/common';
import { DOCUMENT, Component, computed, inject, input, InputSignal, Signal } from '@angular/core';
import { HiscoreEntry } from '@osrs-tracker/models';
import { Chart, ChartOptions, Point } from 'chart.js';
import { merge } from 'chart.js/helpers';
import { BaseChart } from 'src/app/common/components/charts/base-chart';
import { LOCAL_ICONS } from 'src/app/common/directives/icon/local-icons.token';
import { BOSSES, CLUES, MINIGAMES, RAIDS, UNCHARTED_MINIGAMES } from '../../activity-categories';
import { ACTIVITY_COLORS, ChartActivity } from '../../activity-colors';
import { ChartLegendComponent, LegendItem } from './chart-legend.component';
import { logChartOptions } from './log-chart-options';
import { activitySeries, ChartSeries } from './log-chart-series';
import { TooltipMarkers } from './tooltip-markers';
import { ActivityView, PlayerView } from '../player-view';

// Each category gets its own chart, so large point totals don't bury kill counts. Minigames only chart running totals.
const CATEGORIES: Record<ActivityView, ReadonlySet<string>> = {
  bosses: BOSSES,
  raids: RAIDS,
  clues: CLUES,
  minigames: new Set([...MINIGAMES].filter(name => !(name in UNCHARTED_MINIGAMES))),
};

/**
 * Daily scores of one activity category as grouped bars, over the loaded days: the activities the page doesn't hide,
 * or for minigames the one picked. Takes the daily diffs, newest first.
 */
@Component({
  selector: 'activity-chart',
  template: `
    <div class="relative h-55 lg:h-auto lg:grow lg:min-h-0">
      <canvas #chart></canvas>
      @if (!series().length) {
        <p class="absolute inset-0 flex items-center justify-center text-base text-muted">
          Nothing interesting happened in these days.
        </p>
      }
    </div>
    @if (series().length) {
      <chart-legend class="block mt-4" kind="activity" [items]="legendItems()" (toggled)="toggle($event)" />
    }
  `,
  host: { class: 'flex flex-col grow min-h-0' },
  imports: [ChartLegendComponent],
})
export class ActivityChartComponent extends BaseChart<'bar', HiscoreEntry[]> {
  protected readonly type = 'bar';

  readonly #markers = new TooltipMarkers(inject(DOCUMENT), 'activity', inject(LOCAL_ICONS, { optional: true }));

  private readonly playerView = inject(PlayerView);

  readonly category: InputSignal<ActivityView> = input.required();
  /** The charted minigame */
  readonly minigame: InputSignal<string | undefined> = input();

  /** Every activity of the category with gains; minigames only the picked one */
  readonly #allSeries: Signal<ChartSeries[]> = computed(() => activitySeries(this.data(), CATEGORIES[this.category()]));
  readonly series: Signal<ChartSeries[]> = computed(() =>
    this.category() === 'minigames'
      ? this.#allSeries().filter(series => series.name === this.minigame())
      : this.#allSeries(),
  );
  readonly legendItems: Signal<LegendItem[]> = computed(() =>
    (this.category() === 'minigames' ? this.#allSeries() : this.series()).map(series => ({
      name: series.name,
      color: this.color(series.name),
      total: series.total,
      hidden: this.hidden(series.name),
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
      // Days only make room for the activities that have a score that day
      skipNull: true,
      datasets: {
        bar: { borderRadius: 2, maxBarThickness: 24 },
      },
      scales: {
        y: { ticks: { precision: 0 } },
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
      data: series.points.map(({ x, y }) => ({ x, y: y || null })) as Point[],
      borderColor: this.color(series.name),
      backgroundColor: this.color(series.name),
      hidden: this.hidden(series.name),
    }));
  }
}
