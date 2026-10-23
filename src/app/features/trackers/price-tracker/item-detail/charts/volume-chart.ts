import { formatDate, formatNumber } from '@angular/common';
import { Component } from '@angular/core';
import { Chart, ChartOptions, Point } from 'chart.js';
import { BaseChart } from '@app/common/charts/base-chart';
import { token } from '@app/common/charts/chart-setup';
import { formatNumberShort } from '@app/common/format/number-format';
import { DailyVolume } from '../item-prices';

/**
 * Items bought (accent, above the line) and sold (orange, below it) per UTC day. Both halves share one scale, so the
 * bars compare; the axis counts both up from the line, and the tooltip has the exact numbers.
 */
@Component({
  selector: 'volume-chart',
  template: '<canvas #chart></canvas>',
})
export class VolumeChart extends BaseChart<'bar', DailyVolume[]> {
  protected readonly type = 'bar';

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
          // Dashes the gridlines, as on the price chart
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
            // the days are UTC, whatever the visitor's time zone
            title: ([context]) => formatDate(context.parsed.x!, 'd MMM y', 'en-US', 'UTC'),
            label: context =>
              ` ${context.dataset.label}: ${formatNumber(Math.abs(context.parsed.y!), 'en-US', '1.0-0')}`,
          },
        },
      },
    };
  }

  protected setData(chart: Chart<'bar', Point[]>, volumes: DailyVolume[]): void {
    // Sold is drawn below the line as negative values; the tooltip shows them as positive
    chart.data.datasets = [
      {
        label: 'Bought',
        data: volumes.map(({ day, bought }) => ({ x: day * 1000, y: bought })),
        backgroundColor: () => token('accent'),
        stack: 'volume',
      },
      {
        label: 'Sold',
        data: volumes.map(({ day, sold }) => ({ x: day * 1000, y: -sold })),
        backgroundColor: () => token('orange'),
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
