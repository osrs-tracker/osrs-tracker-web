import { formatNumber } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Chart, ChartOptions, Point, TooltipModel } from 'chart.js';
import { PlayerCountPoint, PlayerCountRange } from '@osrs-tracker/models';
import { format } from 'date-fns';
import { BaseChart } from '@app/common/charts/base-chart';
import { token, withAlpha } from '@app/common/charts/chart-setup';
import { setTimeAxisUnit, timeAxis } from '@app/common/charts/time-axis';
import { formatNumberShort } from '@app/common/format/number-format';
import { formatShare, locationCountsInOrder } from './world-locations';

export interface PlayerCountSeries {
  range: PlayerCountRange;
  /** Oldest first; daily points dated at the local midnight of their UTC day */
  points: PlayerCountPoint[];
  locationOrder: readonly string[];
}

export function lineName(range: PlayerCountRange): string {
  return range === '1y' || range === 'all'
    ? 'Daily average'
    : range === '30d'
      ? 'Hourly average'
      : 'Players online, every 10 minutes';
}

interface HoveredPoint {
  point: PlayerCountPoint;
  /** The point's x and the plot's top and bottom in the chart, in px */
  x: number;
  top: number;
  bottom: number;
  side: 'right' | 'left' | 'pin-left' | 'pin-right';
  /** The chart's width, for placing the tooltip from the right */
  width: number;
}

const fmt = (value: number) => formatNumber(value, 'en-US', '1.0-0');

/** Hovering shows an HTML tooltip: Chart.js' own can't draw the flags */
@Component({
  selector: 'player-count-chart',
  template: `
    <canvas #chart></canvas>
    @if (hovered(); as hovered) {
      <span
        class="absolute w-0 border-l border-dashed border-border pointer-events-none"
        [style.left.px]="hovered.x"
        [style.top.px]="hovered.top"
        [style.height.px]="hovered.bottom - hovered.top"
        aria-hidden="true"
      ></span>
      <div
        class="absolute z-10 flex flex-col gap-1 p-3 rounded-xl bg-card border border-border shadow-float text-xs whitespace-nowrap pointer-events-none"
        [style.top.px]="hovered.top"
        [style.left.px]="hovered.side === 'right' ? hovered.x + 14 : hovered.side === 'pin-left' ? 0 : null"
        [style.right.px]="
          hovered.side === 'left' ? hovered.width - hovered.x + 14 : hovered.side === 'pin-right' ? 0 : null
        "
        aria-hidden="true"
      >
        <span class="font-bold text-strong">{{ tip().title }}</span>
        @for (row of tip().rows; track row.label) {
          <span class="flex items-center gap-1.5 tabular-nums">
            <span class="size-2 shrink-0 rounded-full" [class]="row.dot"></span>{{ row.label }}: {{ row.value }}
          </span>
        }
        <span class="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 mb-0.5 pt-2 border-t border-line">
          @for (location of tip().locations; track location.key) {
            <span class="flex items-center justify-between gap-2" [title]="location.name">
              @if (location.flag) {
                <img class="w-7.5 h-3.75 pixelated ring-1 ring-line" [src]="location.flag" [alt]="location.name" />
              } @else {
                <span class="text-muted">Other</span>
              }
              <span class="tabular-nums">{{ location.players }}</span>
            </span>
          }
        </span>
        <span class="flex flex-col gap-1 mt-0.5 pt-2 border-t border-line">
          @for (row of tip().split; track row.label) {
            <span class="flex items-center gap-2">
              <span class="flex-auto">{{ row.label }}</span>
              <span class="tabular-nums"
                >{{ row.value }} <span class="text-muted">({{ row.share }})</span></span
              >
            </span>
          }
        </span>
      </div>
    }
  `,
  host: { class: 'relative' },
})
export class PlayerCountChart extends BaseChart<'line', PlayerCountSeries> {
  protected readonly type = 'line';

  protected readonly hovered = signal<HoveredPoint | null>(null);

  protected readonly tip = computed(() => {
    const point = this.hovered()!.point;
    const { range, locationOrder } = this.data();
    const daily = range === '1y' || range === 'all';
    const players = point.members + point.f2p;

    return {
      title: format(point.date, daily ? 'MMMM do yyyy' : 'MMMM do - HH:mm'),
      rows: daily
        ? [
            { label: 'Daily average', value: fmt(point.total), dot: 'bg-accent' },
            { label: 'Daily peak', value: fmt(point.peak ?? point.total), dot: 'bg-muted' },
          ]
        : [
            {
              label: range === '30d' ? 'Hourly average' : 'Players online',
              value: fmt(point.total),
              dot: 'bg-accent',
            },
          ],
      locations: locationCountsInOrder(point.byLocation, locationOrder).map(location => ({
        ...location,
        players: fmt(location.players),
      })),
      split: [
        { label: 'Members', value: fmt(point.members), share: formatShare(point.members, players) },
        { label: 'Free-to-play', value: fmt(point.f2p), share: formatShare(point.f2p, players) },
      ],
    };
  });

  protected chartOptions(): ChartOptions<'line'> {
    return {
      datasets: {
        line: {
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointBorderColor: () => token('card'),
          spanGaps: false,
        },
      },
      scales: {
        x: timeAxis(),
        y: {
          position: 'right',
          // From 0, so the filled area's height reads as the count
          beginAtZero: true,
          border: { dash: [4, 6] },
          ticks: { autoSkipPadding: 20, callback: value => formatNumberShort(Number(value)) },
        },
      },
      plugins: {
        tooltip: { enabled: false, external: ({ chart, tooltip }) => this.hover(chart, tooltip) },
      },
    };
  }

  protected setData(chart: Chart<'line', Point[]>, { range, points }: PlayerCountSeries): void {
    setTimeAxisUnit(chart, points.length ? points.at(-1)!.date.getTime() - points[0].date.getTime() : 0);
    this.hovered.set(null);

    const daily = range === '1y' || range === 'all';
    const last = points.length - 1;
    chart.data.datasets = [
      {
        label: lineName(range),
        data: points.map(point => ({ x: point.date.getTime(), y: point.total })),
        borderColor: () => token('accent'),
        backgroundColor: () => withAlpha(token('accent'), 0.14),
        pointBackgroundColor: () => token('accent'),
        // The newest point, the count now; daily ranges end on the last full day, so they draw none
        pointRadius: context => (!daily && context.dataIndex === last ? 4 : 0),
        pointBorderWidth: 2,
        borderWidth: 2.5,
        fill: 'start',
        order: 0,
      },
      ...(daily
        ? [
            {
              label: 'Daily peak',
              data: points.map(point => ({ x: point.date.getTime(), y: point.peak ?? point.total })),
              borderColor: () => token('muted'),
              backgroundColor: () => token('muted'),
              pointBackgroundColor: () => token('muted'),
              borderWidth: 2,
              borderDash: [6, 5],
              order: 1,
            },
          ]
        : []),
    ];
  }

  private hover(chart: Chart, tooltip: TooltipModel<'line'>): void {
    const index = tooltip.dataPoints?.[0]?.dataIndex;
    if (!tooltip.opacity || index === undefined) {
      this.hovered.set(null);
      return;
    }

    const point = this.data().points[index];
    if (this.hovered()?.point === point) return;

    const x = tooltip.caretX;
    const right = x > chart.width / 2;
    this.hovered.set({
      point,
      x,
      top: chart.chartArea.top,
      bottom: chart.chartArea.bottom,
      // Narrow charts (phones) have no room beside the point: the tooltip takes the edge away from it
      side: chart.width < 600 ? (right ? 'pin-left' : 'pin-right') : right ? 'left' : 'right',
      width: chart.width,
    });
  }
}
