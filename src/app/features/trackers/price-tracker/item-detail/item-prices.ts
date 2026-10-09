import { getUnixTime } from 'date-fns';
import { DAY, utcDayStart } from 'src/app/common/helpers/date.helper';
import { AveragePricesAtTime } from 'src/app/common/repositories/osrs-prices.repo';

export interface DailyVolume {
  /** The UTC day's start, in seconds */
  day: number;
  /** Items bought at the instant buy price */
  bought: number;
  /** Items sold at the instant sell price */
  sold: number;
}

/**
 * Items bought and sold per UTC day over the last `days` days, today included (so far), from the hourly time series.
 * Days without trades count as zero.
 */
export function dailyVolumes(hourly: AveragePricesAtTime[], now: Date, days: number): DailyVolume[] {
  const today = utcDayStart(getUnixTime(now));
  const result: DailyVolume[] = Array.from({ length: days }, (_, i) => ({
    day: today - (days - 1 - i) * DAY,
    bought: 0,
    sold: 0,
  }));

  for (const hour of hourly) {
    const index = days - 1 - (today - utcDayStart(hour.timestamp)) / DAY;
    if (index < 0 || index >= days) continue;
    result[index].bought += hour.highPriceVolume ?? 0;
    result[index].sold += hour.lowPriceVolume ?? 0;
  }

  return result;
}

/** Items traded (bought and sold) in the last 24 hours, from the hourly time series */
export function last24HourVolume(hourly: AveragePricesAtTime[], now: Date): number {
  const since = getUnixTime(now) - DAY;
  return hourly
    .filter(hour => hour.timestamp >= since)
    .reduce((sum, hour) => sum + (hour.highPriceVolume ?? 0) + (hour.lowPriceVolume ?? 0), 0);
}

/**
 * Yesterday's (UTC) average instant sell price, weighted by volume, from the hourly time series: the same number as
 * the Wiki's 24-hour average for that day, which the item lists compare with, without loading every item's average.
 */
export function yesterdayAverageSellPrice(hourly: AveragePricesAtTime[], now: Date): number | null {
  const yesterday = utcDayStart(getUnixTime(now)) - DAY;
  let total = 0;
  let volume = 0;

  for (const hour of hourly) {
    if (hour.timestamp < yesterday || hour.timestamp >= yesterday + DAY || !hour.avgLowPrice) continue;
    total += hour.avgLowPrice * hour.lowPriceVolume;
    volume += hour.lowPriceVolume;
  }

  return volume ? Math.round(total / volume) : null;
}

/** A whole number as written in the design: "1,398,000", "−8,402" with a true minus, "+12,000" when `signed` */
export function formatWhole(value: number, signed = false): string {
  const sign = value < 0 ? '−' : signed && value > 0 ? '+' : '';
  return sign + Math.abs(Math.round(value)).toLocaleString('en-US');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A UTC day (in seconds) as "24 Sep", or "24 Sep 2026": the days are UTC, whatever the visitor's time zone */
export function formatUtcDay(day: number, withYear = false): string {
  const date = new Date(day * 1000);
  const text = `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  return withYear ? `${text} ${date.getUTCFullYear()}` : text;
}
