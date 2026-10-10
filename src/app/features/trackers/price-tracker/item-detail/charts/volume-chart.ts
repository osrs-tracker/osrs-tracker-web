import { formatNumber } from '@angular/common';
import { Component } from '@angular/core';
import { Chart, ChartOptions, Point } from 'chart.js';
import { BaseChart } from '@app/common/components/charts/base-chart';
import { token } from '@app/common/components/charts/chart-setup';
import { DailyVolume, formatUtcDay } from '../item-prices';

/**
 * Items bought (accent, above the line) and sold (orange, below it) per UTC day. Both halves share one scale, so the
 * bars compare; there's no axis, the tooltip has the numbers.
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
        y: { display: false, stacked: true },
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: ([context]) => formatUtcDay(context.parsed.x! / 1000, true),
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
