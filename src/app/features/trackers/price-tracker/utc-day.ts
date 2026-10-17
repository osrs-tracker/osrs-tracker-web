import { fromUnixTime, getUnixTime } from 'date-fns';

/** Seconds in a day */
export const DAY = 86400;

/** The start of the UTC day a Unix time in seconds falls in, in seconds, as the OSRS Wiki API uses */
export function utcDayStart(seconds: number): number {
  return seconds - (seconds % DAY);
}

/** The start of yesterday's UTC day: the last finished `/24h` bucket, which the item lists and tables share */
export function yesterdayStart(now = new Date()): Date {
  return fromUnixTime(utcDayStart(getUnixTime(now)) - DAY);
}
