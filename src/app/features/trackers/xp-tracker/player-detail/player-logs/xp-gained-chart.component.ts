import { formatNumber } from '@angular/common';
import { DOCUMENT, Component, computed, inject, linkedSignal, Signal, WritableSignal } from '@angular/core';
import { HiscoreEntry } from '@osrs-tracker/models';
import { Chart, ChartOptions, Point } from 'chart.js';
import { merge } from 'chart.js/helpers';
import { BaseChart } from 'src/app/common/components/charts/base-chart';
import { LOCAL_ICONS } from 'src/app/common/directives/icon/local-icons.token';
import { formatNumberLegible } from 'src/app/common/helpers/number.helper';
import { ChartSkill, SKILL_COLORS } from '../../skill-colors';
import { ChartLegendComponent, LegendItem } from './chart-legend.component';
import { logChartOptions, toggled } from './log-chart-options';
import { ChartSeries, xpGainedSeries } from './log-chart-series';
import { TooltipMarkers } from './tooltip-markers';

/** The skills with the largest gains are shown, the others start hidden in the legend. */
const DEFAULT_VISIBLE = 6;

/** XP gained so far per skill, over the loaded days. Takes the daily diffs, newest first. */
@Component({
  selector: 'xp-gained-chart',
  template: `
    <div class="relative h-72">
      <canvas #chart></canvas>
      @if (!series().length) {
        <p class="absolute inset-0 flex items-center justify-center text-base opacity-70">
          No XP gained in these days.
        </p>
      }
    </div>
    @if (series().length) {
      <chart-legend
        class="block mt-4"
        kind="skill"
        prefix="+"
        [showNames]="false"
        [collapseAfter]="DEFAULT_VISIBLE"
        [items]="legendItems()"
        (toggled)="toggle($event)"
      />
    }
  `,
  imports: [ChartLegendComponent],
})
export class XpGainedChartComponent extends BaseChart<'line', HiscoreEntry[]> {
  protected readonly type = 'line';

  readonly DEFAULT_VISIBLE = DEFAULT_VISIBLE;

  readonly #markers = new TooltipMarkers(inject(DOCUMENT), 'skill', inject(LOCAL_ICONS, { optional: true }));

  readonly series: Signal<ChartSeries<ChartSkill>[]> = computed(() => xpGainedSeries(this.data()));
  /** Starts with the largest gains and only changes when toggled, so loading more days doesn't hide a shown skill */
  readonly #visible: WritableSignal<ReadonlySet<string>> = linkedSignal({
    source: this.series,
    computation: (series, previous) =>
      previous?.source.length ? previous.value : new Set(series.slice(0, DEFAULT_VISIBLE).map(({ name }) => name)),
  });
  readonly legendItems: Signal<LegendItem[]> = computed(() =>
    this.series().map(series => ({
      name: series.name,
      color: this.color(series.name),
      total: series.total,
      hidden: !this.#visible().has(series.name),
    })),
  );

  toggle(name: string): void {
    this.#visible.update(visible => toggled(visible, name));
  }

  private color(skill: ChartSkill): string {
    return SKILL_COLORS[skill][this.darkMode() ? 'dark' : 'light'];
  }

  protected chartOptions(): ChartOptions<'line'> {
    return merge(logChartOptions<'line'>(this.#markers), {
      datasets: {
        line: { pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 },
      },
      scales: {
        y: { ticks: { autoSkipPadding: 20, callback: value => formatNumberLegible(Number(value)) } },
      },
      plugins: {
        tooltip: {
          itemSort: (a, b) => b.parsed.y! - a.parsed.y!,
          // the markers stay on the left
          bodyAlign: 'right',
          callbacks: {
            // the skill icon replaces the name
            label: context => `+${formatNumber(context.parsed.y!, 'en-US', '1.0-0')}`,
          },
        },
      },
    } satisfies ChartOptions<'line'>);
  }

  protected setData(chart: Chart<'line', Point[]>): void {
    chart.data.datasets = this.series().map(series => ({
      label: series.name,
      data: series.points,
      borderColor: this.color(series.name),
      backgroundColor: this.color(series.name),
      hidden: !this.#visible().has(series.name),
    }));
  }
}
