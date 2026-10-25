import { formatNumber } from '@angular/common';
import { Component, input } from '@angular/core';
import { Chart, ChartOptions, Point, TimeScaleOptions } from 'chart.js';
import { fromUnixTime } from 'date-fns';
import { BaseChart } from '@app/common/charts/base-chart';
import { token, withAlpha } from '@app/common/charts/chart-setup';
import { formatNumberLegible } from '@app/common/format/number-format';
import { AveragePricesAtTime } from '@app/common/api/osrs-prices-repo';
import { PRICE_LINES, PriceLine } from '../price-ranges';

/** A hidden line's area goes with it: the buy line's then reaches down to the axis. */
@Component({
  selector: 'price-chart',
  template: '<canvas #chart></canvas>',
})
export class PriceChart extends BaseChart<'line', AveragePricesAtTime[]> {
  protected readonly type = 'line';

  readonly hiddenLines = input<ReadonlySet<PriceLine>>(new Set());

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
    const span = priceTimeSeries.length ? priceTimeSeries.at(-1)!.timestamp - priceTimeSeries[0].timestamp : 0;
    (chart.options.scales!['x'] as TimeScaleOptions).time.unit =
      span > 60 * 86400 ? 'month' : span > 2 * 86400 ? 'day' : 'hour';

    const [buy, sell] = PRICE_LINES;
    chart.data.datasets = [
      {
        label: buy,
        data: priceTimeSeries.map(price => ({ x: fromUnixTime(price.timestamp).getTime(), y: price.avgHighPrice })),
        borderColor: () => token('accent'),
        // The spread, down to the sell line
        backgroundColor: () => withAlpha(token('accent'), 0.14),
        pointBackgroundColor: () => token('accent'),
        borderWidth: 2.5,
        hidden: this.hiddenLines().has(buy),
        fill: '+1',
        order: 0,
      },
      {
        label: sell,
        data: priceTimeSeries.map(price => ({ x: fromUnixTime(price.timestamp).getTime(), y: price.avgLowPrice })),
        // Violet, as the volume chart's sold bars: the same trades
        borderColor: () => token('sold'),
        backgroundColor: () => withAlpha(token('sold'), 0.14),
        pointBackgroundColor: () => token('sold'),
        borderWidth: 2.5,
        hidden: this.hiddenLines().has(sell),
        fill: 'start',
        order: 1,
      },
    ];
  }
}
