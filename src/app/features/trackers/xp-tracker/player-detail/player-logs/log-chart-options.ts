import { ChartOptions } from 'chart.js';
import { format } from 'date-fns';
import { LogPoint } from './log-chart-series';
import { MARKER_HEIGHT, MARKER_WIDTH, TooltipMarkers } from './tooltip-markers';

/** Options shared by the log charts: a day axis, tooltips with the icon markers and no zoom. */
export function logChartOptions<TType extends 'line' | 'bar'>(markers: TooltipMarkers): ChartOptions<TType> {
  // typed as a bar chart's: the options used here have the same shape for line charts
  const options: ChartOptions<'bar'> = {
    scales: {
      x: {
        time: { unit: 'day', displayFormats: { day: 'MMM d' } },
        // room between the day labels, so narrow charts skip some instead of crowding them
        ticks: { autoSkipPadding: 16 },
      },
      y: { beginAtZero: true },
    },
    plugins: {
      tooltip: {
        filter: item => item.parsed.y! > 0,
        usePointStyle: true,
        boxWidth: MARKER_WIDTH,
        boxHeight: MARKER_HEIGHT,
        boxPadding: 4,
        callbacks: {
          // the day, or the days a gap in the history covers
          title: ([item]) => {
            if (!item) return '';
            const { x, from } = item.raw as LogPoint;
            return from === undefined ? format(x, 'MMMM do') : `${format(from, 'MMMM do')} – ${format(x, 'MMMM do')}`;
          },
          labelPointStyle: context => ({
            pointStyle: markers.get(context.dataset.borderColor as string, context.dataset.label!),
            rotation: 0,
          }),
        },
      },
      zoom: { pan: { enabled: false }, zoom: { wheel: { enabled: false }, pinch: { enabled: false } } },
    },
  };
  return options as unknown as ChartOptions<TType>;
}

/** A copy of the set with the name added, or removed if it was in it */
export function toggled(set: ReadonlySet<string>, name: string): ReadonlySet<string> {
  const next = new Set(set);
  if (!next.delete(name)) next.add(name);
  return next;
}
