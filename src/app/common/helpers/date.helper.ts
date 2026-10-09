import { getUnixTime } from 'date-fns';

const DAY = 86400;

/** The start of the UTC day `time` (a `Date` or Unix seconds) falls in, in Unix seconds, as the OSRS Wiki API uses */
export function utcDayStart(time: Date | number): number {
  const seconds = typeof time === 'number' ? time : getUnixTime(time);
  return seconds - (seconds % DAY);
}
