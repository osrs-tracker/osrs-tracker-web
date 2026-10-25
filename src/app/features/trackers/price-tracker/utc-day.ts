import { fromUnixTime, getUnixTime } from 'date-fns';

/** Seconds in a day */
export const DAY = 86400;

/** In seconds, as the OSRS Wiki API uses */
export function utcDayStart(seconds: number): number {
  return seconds - (seconds % DAY);
}

/** The last finished `/24h` bucket, which the item lists and tables share */
export function yesterdayStart(now = new Date()): Date {
  return fromUnixTime(utcDayStart(getUnixTime(now)) - DAY);
}
