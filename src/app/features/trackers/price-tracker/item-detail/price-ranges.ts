import { SegmentedOption } from '@app/common/ui/controls/segmented';
import { Lookback } from '@app/common/api/osrs-prices-repo';
import { TimeBin } from '@app/common/charts/time-bins';

/** The ranges of the price and volume charts, each picked on its own card */
export type PriceRange = '1D' | '1W' | '1M' | '1Y';

/**
 * The Wiki time series behind each range, and how far back the range goes. The 1W series, hourly, also feeds the
 * volume's summary and the stat tiles.
 */
export const PRICE_RANGES: Record<
  PriceRange,
  { lookback: Lookback; seconds: number; title: string; bin: TimeBin; next?: PriceRange }
> = {
  '1D': { lookback: '24h', seconds: 86400, title: 'day', bin: 'hour', next: '1W' },
  '1W': { lookback: '7d', seconds: 7 * 86400, title: 'week', bin: 'day', next: '1M' },
  '1M': { lookback: '30d', seconds: 30 * 86400, title: 'month', bin: 'day', next: '1Y' },
  '1Y': { lookback: '1y', seconds: 365 * 86400, title: 'year', bin: 'month' },
};

/** The price chart's lines, which its legend shows and hides */
export type PriceLine = 'Instant buy' | 'Instant sell';
export const PRICE_LINES: PriceLine[] = ['Instant buy', 'Instant sell'];

export const RANGE_OPTIONS: SegmentedOption<PriceRange>[] = (Object.keys(PRICE_RANGES) as PriceRange[]).map(range => ({
  value: range,
  label: range,
  title: `Last ${PRICE_RANGES[range].title}`,
}));
