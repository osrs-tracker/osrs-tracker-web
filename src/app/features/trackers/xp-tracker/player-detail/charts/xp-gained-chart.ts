import { formatNumber } from '@angular/common';
import { DOCUMENT, Component, computed, inject } from '@angular/core';
import { SkillEnum } from '@osrs-tracker/models';
import { Chart, ChartOptions, Point } from 'chart.js';
import { merge } from 'chart.js/helpers';
import { ChartTable } from '@app/common/charts/chart-table';
import { token, withAlpha } from '@app/common/charts/chart-setup';
import { LOCAL_ICONS } from '@app/common/icon/local-icons-token';
import { formatNumberLegible } from '@app/common/format/number-format';
import { ChartSkill, SKILL_COLORS } from '../colors/skill-colors';
import { PlayerView } from '../player-view';
import { ChartLegend, LegendItem } from './chart-legend';
import { LogChart } from './log-chart';
import { logChartOptions } from './log-chart-options';
import { logTableRows, xpGainedSeries } from './log-chart-series';
import { TooltipMarkers } from './tooltip-markers';

/** Above this many days, the points crowd the line */
const MAX_POINTS = 15;

const CHIPS_SHOWN = 7;

@Component({
  selector: 'xp-gained-chart',
  template: `
    <!-- Hidden, not removed, while the table shows: the chart is created once, on its canvas -->
    <div class="relative h-55 lg:h-auto lg:grow lg:min-h-35" [class.hidden]="tableShown()">
      <canvas #chart role="img" [class.invisible]="!series().length" [attr.aria-label]="label()"></canvas>
      @if (!series().length) {
        <p class="absolute inset-0 flex items-center justify-center text-base text-muted">
          No XP gained in these days.
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
    <chart-legend
      class="mt-4"
      kind="skill"
      [items]="chips()"
      [collapseAfter]="CHIPS_SHOWN"
      (toggled)="playerView.toggleSkill($event)"
    />
  `,
  host: { class: 'flex flex-col grow min-h-0' },
  imports: [ChartLegend, ChartTable],
})
export class XpGainedChart extends LogChart<'line'> {
  protected readonly type = 'line';

  readonly playerView = inject(PlayerView);

  readonly CHIPS_SHOWN = CHIPS_SHOWN;

  readonly #markers = new TooltipMarkers(inject(DOCUMENT), 'skill', inject(LOCAL_ICONS, { optional: true }));

  readonly series = computed(() => xpGainedSeries(this.data(), [...this.playerView.skills()]));
  readonly chips = computed<LegendItem[]>(() => {
    const picked = this.playerView.skills();
    const names = [SkillEnum.Overall, ...xpGainedSeries(this.data()).map(({ name }) => name)];
    return names.map(name => ({ name, color: this.cssColor(name), on: picked.has(name) }));
  });
  readonly tableColumns = computed(() => ['Day', ...this.series().map(({ name }) => `${name} (XP)`)]);
  readonly tableRows = computed(() => logTableRows(this.series(), true));
  readonly label = computed(() => `${[...this.playerView.skills()].join(', ')} XP gained over the period, cumulative`);

  /** For the chips, in CSS: Overall is the accent token, a skill without a colour (newer than the enum) muted */
  private cssColor(skill: string): string {
    if (skill === SkillEnum.Overall) return 'var(--accent)';
    return this.skillColor(skill) ?? 'var(--muted)';
  }

  /** For the canvas, which can't read CSS variables */
  private color(skill: string): string {
    if (skill === SkillEnum.Overall) return token('accent');
    return this.skillColor(skill) ?? token('muted');
  }

  private skillColor(skill: string): string | undefined {
    // the skills come from the diffs, which can hold one Jagex added after the enum
    return (SKILL_COLORS as Partial<typeof SKILL_COLORS>)[skill as ChartSkill]?.[this.darkMode() ? 'dark' : 'light'];
  }

  protected chartOptions(): ChartOptions<'line'> {
    return merge(logChartOptions<'line'>(this.#markers), {
      datasets: {
        line: {
          borderWidth: 2.5,
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
      fill: single ? 'origin' : false,
      backgroundColor: single ? withAlpha(this.color(series.name), 0.16) : this.color(series.name),
    }));
  }
}
