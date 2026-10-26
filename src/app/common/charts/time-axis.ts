import { Chart, ChartOptions, Point, TimeScaleOptions, TimeUnit } from 'chart.js';

type XAxisOptions = NonNullable<ChartOptions<'line'>['scales']>['x'];

/**
 * An x axis spaced by time rather than by point, so there's one label per hour, day or month (`setTimeAxisUnit`).
 * Without a `tooltipFormat`, `BaseChart`'s stays: an `undefined` one would replace it in the merge.
 */
export function timeAxis(tooltipFormat?: string): XAxisOptions {
  return {
    type: 'time',
    grid: { display: false },
    ticks: { source: 'auto', stepSize: 1, autoSkipPadding: 24 },
    time: {
      displayFormats: { hour: 'HH:mm', day: 'd MMM', month: 'MMM yyyy' },
      ...(tooltipFormat && { tooltipFormat }),
    },
  };
}

/**
 * Hours for a day, days for up to two months, months beyond: by the data's span, as a range that only just started
 * counting would otherwise get no labels at all
 */
export function setTimeAxisUnit(chart: Chart<'line', Point[]>, spanMs: number): void {
  const day = 86_400_000;
  const unit: TimeUnit = spanMs > 60 * day ? 'month' : spanMs > 2 * day ? 'day' : 'hour';
  (chart.options.scales!['x'] as TimeScaleOptions).time.unit = unit;
}
