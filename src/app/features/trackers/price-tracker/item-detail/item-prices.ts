import { addHours, fromUnixTime, getUnixTime, startOfHour } from 'date-fns';
import { Item } from '@osrs-tracker/models';
import { DAY, utcDayStart } from '../utc-day';
import { geTax, isGeTaxExempt } from './ge-tax';
import { AveragePricesAtTime, LatestPrices } from '@app/common/api/osrs-prices-repo';
import {
  formatNumberLegible,
  formatPercentChange,
  formatWhole,
  formatWholeCompact,
  PercentChange,
} from '@app/common/format/number-format';
import { ChartTableRow } from '@app/common/charts/chart-table';
import { binByTime, TimeBin, timeBinLabel } from '@app/common/charts/time-bins';

export interface ItemStat {
  label: string;
  value: string;
  sub: string;
  info: string;
  tip?: string;
  subTip?: string;
  loading?: boolean;
}

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
  timeAgo: (time?: Date) => string | null;
}

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
  // The header says the price didn't load, with a retry; the tiles only mark it
  if (latestFailed) return { label, info, value: '–', sub: 'Not loaded' };
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
    sub: latestFailed ? 'Not loaded' : exempt ? 'No tax on this item' : 'Buy − sell − 2% tax',
    loading: latestLoading,
  };
}

/** A rolling 24 hours, while the volume card below counts hours, UTC days or UTC months */
function volumeStat({ hourly, hourlyLoading, hourlyFailed, now }: ItemStatsInput): ItemStat {
  return {
    label: 'Volume',
    info: 'The number of times the item has been traded within the last 24 hours.',
    ...(hourlyFailed ? { value: '–' } : amount(last24HourVolume(hourly, now), 'traded')),
    // The chart or the volume card says it didn't load, with a retry
    sub: hourlyFailed ? 'Not loaded' : 'Last 24 hours',
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
  const lowAlch = item.lowalch ?? 0;
  // Shortened from 1M, as "Low alch 2,800,000" doesn't fit a phone's tile; the tooltip has it in full
  const short = lowAlch >= 1_000_000;
  return {
    label: 'High alch',
    info: 'Coins received from casting High Level Alchemy on the item.',
    ...(item.highalch ? amount(item.highalch, 'gp') : { value: '–' }),
    sub: item.highalch
      ? `Low alch ${short ? formatNumberLegible(lowAlch) : formatWholeCompact(lowAlch)}`
      : "Can't be alched for coins",
    subTip: item.highalch && short ? `Low alch ${formatWhole(lowAlch)} gp` : undefined,
  };
}

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

export interface BinVolume {
  /** The bin's start, in milliseconds */
  start: number;
  bought: number;
  sold: number;
}

/**
 * In milliseconds. Hours are the visitor's, as on the price chart; days and months are UTC, as the Wiki counts its days
 * (its daily points start at UTC midnight).
 */
const VOLUME_BINS: Record<TimeBin, { start: (ms: number) => number; next: (ms: number) => number }> = {
  hour: { start: ms => startOfHour(ms).getTime(), next: ms => addHours(ms, 1).getTime() },
  day: { start: ms => utcDayStart(ms / 1000) * 1000, next: ms => ms + DAY * 1000 },
  month: { start: ms => utcMonth(ms, 0), next: ms => utcMonth(ms, 1) },
};

function utcMonth(ms: number, offset: number): number {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset);
}

/** The first bin is the first the range covers from its start, so it isn't a part of one. */
export function binnedVolumes(series: AveragePricesAtTime[], now: Date, seconds: number, bin: TimeBin): BinVolume[] {
  const { start, next } = VOLUME_BINS[bin];
  const from = now.getTime() - seconds * 1000;
  const bins = new Map<number, BinVolume>();
  for (let at = start(from) < from ? next(start(from)) : from; at <= now.getTime(); at = next(at))
    bins.set(at, { start: at, bought: 0, sold: 0 });

  for (const point of series) {
    const volume = bins.get(start(point.timestamp * 1000));
    if (!volume) continue;
    volume.bought += point.highPriceVolume ?? 0;
    volume.sold += point.lowPriceVolume ?? 0;
  }

  return [...bins.values()];
}

function last24HourVolume(hourly: AveragePricesAtTime[], now: Date): number {
  const since = getUnixTime(now) - DAY;
  return hourly
    .filter(hour => hour.timestamp >= since)
    .reduce((sum, hour) => sum + (hour.highPriceVolume ?? 0) + (hour.lowPriceVolume ?? 0), 0);
}

/**
 * From the hourly series, to match the Wiki's 24-hour average for that day, which the item lists compare with, without
 * loading every item's average.
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

/** Whether any point in the series has a trade: the Wiki sends points without one as `null` prices */
export function hasTrades(prices: AveragePricesAtTime[]): boolean {
  return prices.some(price => price.avgHighPrice || price.avgLowPrice);
}

/** For screen readers, as the chart's values are otherwise only in the hover tooltip. */
export function priceChartSummary(prices: AveragePricesAtTime[], period: string): string {
  const describe = (name: string, values: number[]): string => {
    const traded = values.filter(Boolean);
    if (!traded.length) return `${name}: no trades.`;
    const [first, last] = [traded[0], traded.at(-1)!].map(value => formatWhole(value));
    const [low, high] = [Math.min(...traded), Math.max(...traded)].map(value => formatWhole(value));
    return `${name}: ${first} gp at the start, ${last} gp at the end, low ${low}, high ${high}.`;
  };

  return [
    `Instant buy and instant sell price over the last ${period}.`,
    describe(
      'Instant buy',
      prices.map(price => price.avgHighPrice),
    ),
    describe(
      'Instant sell',
      prices.map(price => price.avgLowPrice),
    ),
  ].join(' ');
}

export interface PriceChange {
  percent: string;
  tone: PercentChange['tone'];
  last: string;
}

export function priceChange(values: number[]): PriceChange | undefined {
  const traded = values.filter(Boolean);
  if (!traded.length) return undefined;
  const [first, last] = [traded[0], traded.at(-1)!];
  const { signed, tone } = formatPercentChange(last, first);
  return { percent: signed, tone, last: formatWhole(last) };
}

/** Bins are in the visitor's time zone, as the chart's axis. */
export function priceTableRows(prices: AveragePricesAtTime[], bin: TimeBin): ChartTableRow[] {
  const average = (
    points: AveragePricesAtTime[],
    price: 'avgHighPrice' | 'avgLowPrice',
    volume: 'highPriceVolume' | 'lowPriceVolume',
  ) => {
    const traded = points.filter(point => point[price] && point[volume]);
    const count = traded.reduce((sum, point) => sum + point[volume], 0);
    return count ? formatWhole(traded.reduce((sum, point) => sum + point[price] * point[volume], 0) / count) : '—';
  };
  return binByTime(prices, price => fromUnixTime(price.timestamp), bin).map(({ start, points }) => ({
    key: start,
    cells: [
      timeBinLabel(start, bin),
      average(points, 'avgHighPrice', 'highPriceVolume'),
      average(points, 'avgLowPrice', 'lowPriceVolume'),
    ],
  }));
}
