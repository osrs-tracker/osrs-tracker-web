import { formatNumber } from '@angular/common';
import { DOCUMENT, Component, computed, inject, Signal } from '@angular/core';
import { SkillEnum } from '@osrs-tracker/hiscores';
import { Chart, ChartOptions, Point } from 'chart.js';
import { merge } from 'chart.js/helpers';
import { BaseChart } from 'src/app/common/components/charts/base-chart';
import { token, withAlpha } from 'src/app/common/components/charts/chart-setup';
import { LOCAL_ICONS } from 'src/app/common/directives/icon/local-icons.token';
import { formatNumberLegible } from 'src/app/common/helpers/number.helper';
import { ChartSkill, SKILL_COLORS } from '../../skill-colors';
import { Gains } from '../player-summary';
import { PlayerView } from '../player-view';
import { ChartLegendComponent, LegendItem } from './chart-legend.component';
import { logChartOptions } from './log-chart-options';
import { ChartSeries, xpGainedSeries } from './log-chart-series';
import { TooltipMarkers } from './tooltip-markers';

/** Above this many days, the points crowd the line */
const MAX_POINTS = 15;

/** Overall and the skills with the largest gains get a chip; the rest wait behind "+N" */
const CHIPS_SHOWN = 7;

/**
 * XP gained so far over the period: one cumulative line per picked skill (Overall in the accent colour), with chips to
 * add and remove skills. Takes the daily diffs, newest first.
 */
@Component({
  selector: 'xp-gained-chart',
  template: `
    <div class="relative h-55 lg:h-auto lg:grow lg:min-h-35">
      <canvas #chart role="img" [class.invisible]="!series().length" [attr.aria-label]="label()"></canvas>
      @if (!series().length) {
        <p class="absolute inset-0 flex items-center justify-center text-base text-muted">
          No XP gained in these days.
        </p>
      }
    </div>
    <chart-legend
      class="block mt-4"
      kind="skill"
      [items]="chips()"
      [collapseAfter]="CHIPS_SHOWN"
      (toggled)="playerView.toggleSkill($event)"
    />
  `,
  host: { class: 'flex flex-col grow min-h-0' },
  imports: [ChartLegendComponent],
})
export class XpGainedChartComponent extends BaseChart<'line', Gains[]> {
  protected readonly type = 'line';

  readonly playerView = inject(PlayerView);

  readonly CHIPS_SHOWN = CHIPS_SHOWN;

  readonly #markers = new TooltipMarkers(inject(DOCUMENT), 'skill', inject(LOCAL_ICONS, { optional: true }));

  /** The picked skills that gained XP */
  readonly series: Signal<ChartSeries[]> = computed(() => xpGainedSeries(this.data(), [...this.playerView.skills()]));
  /** Overall, then the skills that gained XP, largest first; only those can be picked */
  readonly chips: Signal<LegendItem[]> = computed(() => {
    const picked = this.playerView.skills();
    const names = [SkillEnum.Overall, ...xpGainedSeries(this.data()).map(({ name }) => name)];
    return names.map(name => ({ name, color: this.cssColor(name), on: picked.has(name) }));
  });
  readonly label: Signal<string> = computed(
    () => `${[...this.playerView.skills()].join(', ')} XP gained over the period, cumulative`,
  );

  /** For the chips, in CSS: Overall is the accent token */
  private cssColor(skill: string): string {
    return skill === SkillEnum.Overall
      ? 'var(--accent)'
      : SKILL_COLORS[skill as ChartSkill][this.darkMode() ? 'dark' : 'light'];
  }

  /** For the canvas, which can't read CSS variables */
  private color(skill: string): string {
    return skill === SkillEnum.Overall ? token('accent') : this.cssColor(skill);
  }

  protected chartOptions(): ChartOptions<'line'> {
    return merge(logChartOptions<'line'>(this.#markers), {
      datasets: {
        line: {
          borderWidth: 2.5,
          // a point per day while they fit; 30 and 60 days only show the one under the cursor
          pointRadius: context => ((context.dataset.data as Point[]).length > MAX_POINTS ? 0 : 4),
          pointHoverRadius: 6,
          pointBorderWidth: 2.5,
          tension: 0,
        },
      },
      scales: {
        y: { ticks: { autoSkipPadding: 20, callback: value => formatNumberLegible(Number(value)) } },
      },
      plugins: {
        tooltip: {
          itemSort: (a, b) => b.parsed.y! - a.parsed.y!,
          callbacks: {
            // that day's gain, and the total so far
            label: context => {
              const points = context.dataset.data as Point[];
              const day = context.parsed.y! - (points[context.dataIndex - 1]?.y ?? 0);
              const name = this.series().length > 1 ? `${context.dataset.label}: ` : '';
              return `${name}+${formatNumber(day, 'en-US', '1.0-0')} (${formatNumberLegible(context.parsed.y!)} total)`;
            },
          },
        },
      },
    } satisfies ChartOptions<'line'>);
  }

  protected setData(chart: Chart<'line', Point[]>): void {
    const single = this.series().length === 1;
    chart.data.datasets = this.series().map(series => ({
      label: series.name,
      data: series.points,
      borderColor: this.color(series.name),
      pointBackgroundColor: token('card'),
      pointBorderColor: this.color(series.name),
      // one skill gets the area under its line
      fill: single ? 'origin' : false,
      backgroundColor: single ? withAlpha(this.color(series.name), 0.16) : this.color(series.name),
    }));
  }
}
