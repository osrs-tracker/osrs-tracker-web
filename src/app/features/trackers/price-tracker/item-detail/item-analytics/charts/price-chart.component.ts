import { formatNumber } from '@angular/common';
import { Component, Signal, computed } from '@angular/core';
import { Chart, ChartOptions, Point } from 'chart.js';
import { fromUnixTime } from 'date-fns';
import { formatNumberLegible } from 'src/app/common/helpers/number.helper';
import { AveragePricesAtTime } from 'src/app/common/repositories/osrs-prices.repo';
import { BaseChart } from 'src/app/common/components/charts/base-chart';

@Component({
  selector: 'price-chart',
  template: '<canvas #chart></canvas>',
})
export class PriceChartComponent extends BaseChart<'line', AveragePricesAtTime[]> {
  protected readonly type = 'line';

  readonly latestHighPrice: Signal<AveragePricesAtTime> = computed(
    () =>
      this.data()
        .filter(v => v.avgHighPrice)
        .slice(-1)[0],
  );
  readonly latestLowPrice: Signal<AveragePricesAtTime> = computed(
    () =>
      this.data()
        .filter(v => v.avgLowPrice)
        .slice(-1)[0],
  );

  protected chartOptions(): ChartOptions<'line'> {
    return {
      datasets: {
        line: {
          pointRadius: 0,
          pointHoverRadius: 4,
          spanGaps: true,
          borderWidth: 2,
        },
      },
      scales: {
        y: {
          ticks: {
            autoSkipPadding: 20,
            callback: value => formatNumberLegible(Number(value), 3),
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
    chart.data.datasets = [
      {
        label: 'Buy price',
        data: priceTimeSeries.map(price => ({
          x: fromUnixTime(price.timestamp).getTime(),
          y: price.avgHighPrice,
        })),
        borderColor: this.chartConfig().buyColor,
        backgroundColor: this.chartConfig().buyColor,
      },
      {
        label: 'Sell price',
        data: priceTimeSeries.map(price => ({
          x: fromUnixTime(price.timestamp).getTime(),
          y: price.avgLowPrice,
        })),
        borderColor: this.chartConfig().sellColor,
        backgroundColor: this.chartConfig().sellColor,
      },
    ];

    chart.options.plugins!.annotation = {
      annotations: {
        latestBuy: {
          type: 'line',
          yMin: this.latestHighPrice()?.avgHighPrice,
          yMax: this.latestHighPrice()?.avgHighPrice,
          borderColor: this.chartConfig().buyColor,
          borderDash: [5, 5],
          borderDashOffset: 2,
          borderWidth: 1,
        },
        latestSell: {
          type: 'line',
          yMin: this.latestLowPrice()?.avgLowPrice,
          yMax: this.latestLowPrice()?.avgLowPrice,
          borderColor: this.chartConfig().sellColor,
          borderDash: [5, 5],
          borderDashOffset: 2,
          borderWidth: 1,
        },
      },
    };
  }
}
