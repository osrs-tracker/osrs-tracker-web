import { formatNumber } from '@angular/common';
import { Component } from '@angular/core';
import { Chart, ChartOptions, Point, TimeScaleOptions } from 'chart.js';
import { fromUnixTime } from 'date-fns';
import { BaseChart } from '@app/common/components/charts/base-chart';
import { token, withAlpha } from '@app/common/components/charts/chart-setup';
import { formatNumberLegible } from '@app/common/helpers/number-format';
import { AveragePricesAtTime } from '@app/common/repositories/osrs-prices-repo';

/** The instant buy price as a solid accent line over a light area, the instant sell price as a dashed muted line. */
@Component({
  selector: 'price-chart',
  template: '<canvas #chart></canvas>',
})
export class PriceChart extends BaseChart<'line', AveragePricesAtTime[]> {
  protected readonly type = 'line';

  protected chartOptions(): ChartOptions<'line'> {
    return {
      datasets: {
        line: {
          pointRadius: 0,
          pointHoverRadius: 4,
          spanGaps: true,
        },
      },
      scales: {
        x: {
          // Spaced by time rather than by point, so there's one label per hour, day or month
          type: 'time',
          grid: { display: false },
          ticks: { source: 'auto', stepSize: 1, autoSkipPadding: 24 },
          time: {
            displayFormats: { hour: 'HH:mm', day: 'd MMM', month: 'MMM yyyy' },
            tooltipFormat: 'd MMM yyyy, HH:mm',
          },
        },
        y: {
          position: 'right',
          // Dashes the gridlines
          border: { dash: [4, 6] },
          ticks: {
            autoSkipPadding: 20,
            callback: value => formatNumberLegible(Number(value)),
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: context => ` ${context.dataset.label}: ${formatNumber(context.parsed.y!, 'en-US', '1.0-0')} gp`,
          },
        },
      },
    };
  }

  protected setData(chart: Chart<'line', Point[]>, priceTimeSeries: AveragePricesAtTime[]): void {
    // Hours for a day, days for up to a month, months beyond
    const span = priceTimeSeries.length ? priceTimeSeries.at(-1)!.timestamp - priceTimeSeries[0].timestamp : 0;
    (chart.options.scales!['x'] as TimeScaleOptions).time.unit =
      span > 60 * 86400 ? 'month' : span > 2 * 86400 ? 'day' : 'hour';

    chart.data.datasets = [
      {
        label: 'Instant buy',
        data: priceTimeSeries.map(price => ({ x: fromUnixTime(price.timestamp).getTime(), y: price.avgHighPrice })),
        borderColor: () => token('accent'),
        backgroundColor: () => withAlpha(token('accent'), 0.14),
        pointBackgroundColor: () => token('accent'),
        borderWidth: 2.5,
        fill: 'start',
        order: 0,
      },
      {
        label: 'Instant sell',
        data: priceTimeSeries.map(price => ({ x: fromUnixTime(price.timestamp).getTime(), y: price.avgLowPrice })),
        borderColor: () => token('muted'),
        backgroundColor: () => token('muted'),
        borderWidth: 2,
        borderDash: [6, 5],
        order: 1,
      },
    ];
  }
}
