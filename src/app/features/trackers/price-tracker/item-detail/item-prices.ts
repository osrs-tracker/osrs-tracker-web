import { getUnixTime } from 'date-fns';
import { Item } from '@osrs-tracker/models';
import { DAY, utcDayStart } from '../utc-day';
import { geTax, isGeTaxExempt } from './ge-tax';
import { AveragePricesAtTime, LatestPrices } from '@app/common/api/osrs-prices-repo';
import { formatNumberLegible } from '@app/common/format/number-format';

/** One of the item page's stat tiles */
export interface ItemStat {
  label: string;
  value: string;
  sub: string;
  info: string;
  tip?: string;
  loading?: boolean;
}

/** What the item page's stat tiles are built from */
export interface ItemStatsInput {
  item: Item;
  /** `undefined` while loading or after a failed load */
  latest: LatestPrices | undefined;
  latestLoading: boolean;
  latestFailed: boolean;
  /** The hourly time series, empty while loading or after a failed load */
  hourly: AveragePricesAtTime[];
  hourlyLoading: boolean;
  hourlyFailed: boolean;
  now: Date;
  /** "2 minutes ago", as `TimeAgoPipe` writes it */
  timeAgo: (time?: Date) => string | null;
}

/**
 * The item page's stat tiles: instant buy, instant sell, the margin after GE tax, the daily volume, the buy limit and
 * high alch.
 */
export function itemStats(input: ItemStatsInput): ItemStat[] {
  const { latest } = input;
  return [
    priceStat(input, 'Instant buy', 'The price of the latest instant buy.', latest?.high, latest?.highTime),
    priceStat(input, 'Instant sell', 'The price of the latest instant sell.', latest?.low, latest?.lowTime),
    marginStat(input),
    volumeStat(input),
    buyLimitStat(input.item),
    highAlchStat(input.item),
  ];
}

function priceStat(
  { latestLoading, latestFailed, timeAgo }: ItemStatsInput,
  label: string,
  info: string,
  value?: number,
  time?: Date,
): ItemStat {
  if (latestFailed) return { label, info, value: '–', sub: "Couldn't load the price" };
  if (!value) return { label, info, value: '–', sub: 'No recent trades', loading: latestLoading };
  const ago = timeAgo(time) ?? '';
  // Shortened to fit the tile: "2 min ago"
  const short = ago
    .replace(/ seconds? /, ' sec ')
    .replace(/ minutes? /, ' min ')
    .replace(/ hours? /, ' hr ');
  const { value: text, tip } = amount(value, 'gp');
  const lastTrade = `Last trade was ${ago}.`;
  return { label, info, value: text, sub: `Last trade ${short}`, tip: tip ? `${tip} ${lastTrade}` : lastTrade };
}

function marginStat({ item, latest, latestLoading, latestFailed }: ItemStatsInput): ItemStat {
  const exempt = isGeTaxExempt(item.id);
  const high = latest?.high;
  const low = latest?.low;
  return {
    label: 'Margin after tax',
    info: exempt
      ? 'Instant buy minus instant sell. This item is exempt from GE tax.'
      : 'Instant buy minus instant sell, minus the 2% GE tax on the sale.',
    ...(high && low ? amount(high - low - geTax(item.id, high), 'gp') : { value: '–' }),
    sub: latestFailed ? "Couldn't load the price" : exempt ? 'No tax on this item' : 'Buy − sell − 2% tax',
    loading: latestLoading,
  };
}

function volumeStat({ hourly, hourlyLoading, hourlyFailed, now }: ItemStatsInput): ItemStat {
  return {
    label: 'Daily volume',
    info: 'The number of times the item has been traded within the last 24 hours.',
    ...(hourlyFailed ? { value: '–' } : amount(last24HourVolume(hourly, now), 'traded')),
    sub: hourlyFailed ? "Couldn't load the volume" : 'Last 24 hours',
    loading: hourlyLoading,
  };
}

function buyLimitStat(item: Item): ItemStat {
  return {
    label: 'Buy limit',
    info: 'The amount of times the item can be bought every 4 hours.',
    ...(item.limit ? amount(item.limit, 'items') : { value: '–' }),
    sub: item.limit ? 'Every 4 hours' : 'Unknown',
  };
}

function highAlchStat(item: Item): ItemStat {
  return {
    label: 'High alch',
    info: 'Coins received from casting High Level Alchemy on the item.',
    ...(item.highalch ? amount(item.highalch, 'gp') : { value: '–' }),
    sub: item.highalch ? `Low alch ${formatWholeCompact(item.lowalch ?? 0)}` : "Can't be alched for coins",
  };
}

/** A value shortened to fit ("786.71M"), with the exact amount on hover: "786,705,873 gp." */
function amount(value: number, unit: string): Pick<ItemStat, 'value' | 'tip'> {
  const short = formatWholeCompact(value);
  const whole = formatWhole(value);
  return { value: short, tip: short === whole ? undefined : `${whole} ${unit}.` };
}

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
function last24HourVolume(hourly: AveragePricesAtTime[], now: Date): number {
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

/**
 * A whole number short enough for a compact stat tile on a 390px phone, which fits nine characters: in full as
 * `formatWhole` writes it while it fits ("9,999,999", "−999,999"), otherwise as the item lists write prices, rounded to
 * two decimals with a true minus ("786.71M", "−1.76M", "2.15B").
 */
export function formatWholeCompact(value: number): string {
  const whole = Math.round(value);
  if (whole < 10_000_000 && whole > -1_000_000) return formatWhole(whole);
  return (whole < 0 ? '−' : '') + formatNumberLegible(Math.abs(whole));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A UTC day (in seconds) as "24 Sep", or "24 Sep 2026": the days are UTC, whatever the visitor's time zone */
export function formatUtcDay(day: number, withYear = false): string {
  const date = new Date(day * 1000);
  const text = `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  return withYear ? `${text} ${date.getUTCFullYear()}` : text;
}
