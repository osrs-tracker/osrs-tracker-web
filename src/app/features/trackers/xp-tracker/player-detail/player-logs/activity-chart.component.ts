import { formatNumber } from '@angular/common';
import { DOCUMENT, Component, computed, inject, linkedSignal, Signal, signal, WritableSignal } from '@angular/core';
import { ActivityEnum } from '@osrs-tracker/hiscores';
import { HiscoreEntry } from '@osrs-tracker/models';
import { Chart, ChartOptions, Point } from 'chart.js';
import { merge } from 'chart.js/helpers';
import { BaseChart } from 'src/app/common/components/charts/base-chart';
import { LOCAL_ICONS } from 'src/app/common/directives/icon/local-icons.token';
import { BOSSES, CLUES, MINIGAMES, RAIDS } from '../../activity-categories';
import { ACTIVITY_COLORS, ChartActivity } from '../../activity-colors';
import { ChartLegendComponent, LegendItem } from './chart-legend.component';
import { logChartOptions, toggled } from './log-chart-options';
import { activitySeries, ChartSeries } from './log-chart-series';
import { TooltipMarkers } from './tooltip-markers';

interface ActivityCategory {
  label: string;
  activities: ReadonlySet<string>;
}

// Each category gets its own chart, so large point totals don't bury kill counts
const CATEGORIES: ActivityCategory[] = [
  { label: 'Bosses', activities: BOSSES },
  { label: 'Raids', activities: RAIDS },
  { label: 'Clues', activities: CLUES },
  { label: 'Minigames', activities: MINIGAMES },
];

/** Daily scores of one activity category as grouped bars, over the loaded days. Takes the daily diffs, newest first. */
@Component({
  selector: 'activity-chart',
  template: `
    <div class="button-group w-fit max-w-full overflow-x-auto mb-4">
      @for (category of CATEGORIES; track category.label) {
        <button
          class="disabled:opacity-40"
          [class.active]="category === selected()"
          [disabled]="!categoriesWithData().includes(category)"
          (click)="select(category)"
        >
          {{ category.label }}
        </button>
      }
    </div>

    <div class="relative h-72">
      <canvas #chart></canvas>
      @if (!series().length) {
        <p class="absolute inset-0 flex items-center justify-center text-base opacity-70">
          Nothing interesting happened in these days.
        </p>
      }
    </div>
    @if (series().length) {
      <chart-legend class="block mt-4" kind="activity" [items]="legendItems()" (toggled)="toggle($event)" />
    }
  `,
  imports: [ChartLegendComponent],
})
export class ActivityChartComponent extends BaseChart<'bar', HiscoreEntry[]> {
  protected readonly type = 'bar';

  readonly #markers = new TooltipMarkers(inject(DOCUMENT), 'activity', inject(LOCAL_ICONS, { optional: true }));

  readonly CATEGORIES = CATEGORIES;

  readonly categoriesWithData: Signal<ActivityCategory[]> = computed(() =>
    CATEGORIES.filter(category =>
      this.data().some(diff => diff.activities.some(a => a.score > 0 && category.activities.has(a.name))),
    ),
  );
  /** Stays on the chosen category while it has data, e.g. when more days are loaded */
  readonly selected: WritableSignal<ActivityCategory | undefined> = linkedSignal({
    source: this.categoriesWithData,
    computation: (categories, previous) =>
      previous?.value && categories.includes(previous.value) ? previous.value : categories[0],
  });
  /** Hidden activities of the selected category */
  readonly #hidden: WritableSignal<ReadonlySet<string>> = signal(new Set());

  readonly series: Signal<ChartSeries[]> = computed(() => {
    const category = this.selected();
    // collection log slots come from every category, so each chart shows them (but they don't enable a category)
    return category
      ? activitySeries(this.data(), new Set([...category.activities, ActivityEnum.CollectionsLogged]))
      : [];
  });
  readonly legendItems: Signal<LegendItem[]> = computed(() =>
    this.series().map(series => ({
      name: series.name,
      color: this.color(series.name),
      total: series.total,
      hidden: this.#hidden().has(series.name),
    })),
  );

  select(category: ActivityCategory): void {
    this.selected.set(category);
    this.#hidden.set(new Set());
  }

  toggle(name: string): void {
    this.#hidden.update(hidden => toggled(hidden, name));
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
      hidden: this.#hidden().has(series.name),
    }));
  }
}
