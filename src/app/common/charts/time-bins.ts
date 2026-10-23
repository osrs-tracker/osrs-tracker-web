import { format, startOfDay, startOfHour, startOfMonth } from 'date-fns';

/** How a chart's data table groups its points: per hour for a day, per day for a week or month, per month beyond */
export type TimeBin = 'hour' | 'day' | 'month';

const BIN_START: Record<TimeBin, (date: Date) => Date> = { hour: startOfHour, day: startOfDay, month: startOfMonth };
const BIN_LABEL: Record<TimeBin, string> = { hour: 'd MMM, HH:mm', day: 'EEE d MMM', month: 'MMMM yyyy' };

/** Points grouped by the hour, day or month they fall in (in the visitor's time zone, as the charts' axes), newest first */
export function binByTime<T>(points: T[], date: (point: T) => Date, bin: TimeBin): { start: number; points: T[] }[] {
  const bins = new Map<number, T[]>();
  for (const point of points) {
    const start = BIN_START[bin](date(point)).getTime();
    bins.set(start, [...(bins.get(start) ?? []), point]);
  }
  return [...bins].map(([start, points]) => ({ start, points })).sort((a, b) => b.start - a.start);
}

/** A bin's row header, e.g. "23 Oct, 14:00", "Fri 23 Oct" or "October 2026" */
export function timeBinLabel(start: number, bin: TimeBin): string {
  return format(start, BIN_LABEL[bin]);
}
