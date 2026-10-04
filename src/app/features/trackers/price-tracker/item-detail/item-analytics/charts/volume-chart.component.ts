import { formatNumber } from '@angular/common';
import { Component } from '@angular/core';
import { Chart, ChartOptions, Point } from 'chart.js';
import { fromUnixTime } from 'date-fns';
import { formatNumberLegible } from 'src/app/common/helpers/number.helper';
import { AveragePricesAtTime } from 'src/app/common/repositories/osrs-prices.repo';
import { BaseChart } from './base-chart';

@Component({
  selector: 'volume-chart',
  template: '<canvas #chart></canvas>',
})
export class VolumeChartComponent extends BaseChart<'bar'> {
  protected readonly type = 'bar';

  // Sell volume is drawn below the axis as negative values, so ticks and tooltips show absolute values
  protected chartOptions(): ChartOptions<'bar'> {
    return {
      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            autoSkip: false,
            callback: (value, index, array) => {
              const indexOfZero = array.findIndex(v => v.value === 0);
              const rest = indexOfZero % 2;
              return rest === index % 2 ? formatNumberLegible(Math.abs(Number(value)), 3) : '';
            },
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: context =>
              ` ${context.dataset.label}: ${formatNumber(Math.abs(context.parsed.y!), 'en-US', '1.0-0')}`,
          },
        },
      },
    };
  }

  protected setData(chart: Chart<'bar', Point[]>, volumeTimeSeries: AveragePricesAtTime[]): void {
    chart.data.datasets = [
      {
        label: 'Buy volume',
        data: volumeTimeSeries.map(price => ({
          x: fromUnixTime(price.timestamp).getTime(),
          y: price.highPriceVolume,
        })),
        borderColor: this.chartConfig().buyColor,
        backgroundColor: this.chartConfig().buyColor,
        stack: 'stack',
      },
      {
        label: 'Sell volume',
        data: volumeTimeSeries.map(price => ({
          x: fromUnixTime(price.timestamp).getTime(),
          y: -price.lowPriceVolume,
        })),
        borderColor: this.chartConfig().sellColor,
        backgroundColor: this.chartConfig().sellColor,
        stack: 'stack',
      },
    ];
  }
}
