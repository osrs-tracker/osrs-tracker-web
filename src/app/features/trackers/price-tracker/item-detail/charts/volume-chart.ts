import { formatDate, formatNumber } from '@angular/common';
import { Component } from '@angular/core';
import { Chart, ChartOptions, Point } from 'chart.js';
import { BaseChart } from '@app/common/charts/base-chart';
import { token } from '@app/common/charts/chart-setup';
import { formatNumberShort } from '@app/common/format/number-format';
import { TimeBin } from '@app/common/charts/time-bins';
import { BinVolume } from '../item-prices';

/** The visitor's hours, UTC days and months (`binnedVolumes`) */
const TOOLTIP_TITLE: Record<TimeBin, [format: string, timezone?: string]> = {
  hour: ['d MMM y, HH:mm'],
  day: ['d MMM y', 'UTC'],
  month: ['MMMM y', 'UTC'],
};

/** Both halves share one scale, so the bars compare. */
@Component({
  selector: 'volume-chart',
  template: '<canvas #chart></canvas>',
})
export class VolumeChart extends BaseChart<'bar', { volumes: BinVolume[]; bin: TimeBin }> {
  protected readonly type = 'bar';
  private bin: TimeBin = 'day';

  protected chartOptions(): ChartOptions<'bar'> {
    return {
      datasets: {
        bar: {
          borderRadius: 4,
          barPercentage: 1,
          categoryPercentage: 0.8,
        },
      },
      scales: {
        x: { display: false, stacked: true },
        y: {
          position: 'right',
          stacked: true,
          border: { dash: [4, 6] },
          ticks: {
            maxTicksLimit: 5,
            // Sold counts down from the line, but is a number of items like bought
            callback: value => formatNumberShort(Math.abs(Number(value))),
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: ([context]) => {
              const [format, timezone] = TOOLTIP_TITLE[this.bin];
              return formatDate(context.parsed.x!, format, 'en-US', timezone);
            },
            label: context =>
              ` ${context.dataset.label}: ${formatNumber(Math.abs(context.parsed.y!), 'en-US', '1.0-0')}`,
          },
        },
      },
    };
  }

  protected setData(chart: Chart<'bar', Point[]>, { volumes, bin }: { volumes: BinVolume[]; bin: TimeBin }): void {
    this.bin = bin;
    // Sold is drawn below the line as negative values; the tooltip shows them as positive
    chart.data.datasets = [
      {
        label: 'Bought',
        data: volumes.map(({ start, bought }) => ({ x: start, y: bought })),
        backgroundColor: () => token('accent'),
        stack: 'volume',
      },
      {
        label: 'Sold',
        data: volumes.map(({ start, sold }) => ({ x: start, y: -sold })),
        backgroundColor: () => token('sold'),
        stack: 'volume',
      },
    ];

    const max = Math.max(1, ...volumes.flatMap(({ bought, sold }) => [bought, sold]));
    chart.options.scales!['y']!.min = -max;
    chart.options.scales!['y']!.max = max;

    chart.options.plugins!.annotation = {
      annotations: {
        zero: { type: 'line', yMin: 0, yMax: 0, borderColor: () => token('border'), borderWidth: 1 },
      },
    };
  }
}
