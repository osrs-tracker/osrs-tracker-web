/** Seconds in a day */
export const DAY = 86400;

/** The start of the UTC day a Unix time in seconds falls in, in seconds, as the OSRS Wiki API uses */
export function utcDayStart(seconds: number): number {
  return seconds - (seconds % DAY);
}
