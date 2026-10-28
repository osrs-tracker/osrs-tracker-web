import { Item } from '@osrs-tracker/models';
import { describe, expect, it } from 'vitest';
import { DAY } from '../utc-day';
import { AveragePricesAtTime } from '@app/common/api/osrs-prices-repo';
import {
  ItemStat,
  ItemStatsInput,
  binnedVolumes,
  dailyVolumes,
  hasTrades,
  itemStats,
  priceChartSummary,
  priceTableRows,
  priceChange,
  yesterdayAverageSellPrice,
} from './item-prices';

const TODAY = 1_791_331_200; // 2026-10-07 00:00 UTC
const NOW = new Date((TODAY + 17 * 3600 + 300) * 1000);

const hour = (timestamp: number, avgLowPrice: number, lowPriceVolume: number, highPriceVolume = 0) =>
  ({ timestamp, avgLowPrice, lowPriceVolume, avgHighPrice: 0, highPriceVolume }) as AveragePricesAtTime;

describe('dailyVolumes', () => {
  it('sums the hours per UTC day, oldest first, today last', () => {
    const volumes = dailyVolumes(
      [
        hour(TODAY - 3 * DAY, 1, 100, 100), // outside the window
        hour(TODAY - 2 * DAY + 23 * 3600, 1, 5, 7),
        hour(TODAY - DAY, 1, 1, 2),
        hour(TODAY - DAY + 3600, 1, 3, 4),
        hour(TODAY + 16 * 3600, 1, 10, 20),
      ],
      NOW,
      3,
    );

    expect(volumes).toEqual([
      { day: TODAY - 2 * DAY, bought: 7, sold: 5 },
      { day: TODAY - DAY, bought: 6, sold: 4 },
      { day: TODAY, bought: 20, sold: 10 },
    ]);
  });
});

describe('binnedVolumes', () => {
  const ms = (seconds: number) => seconds * 1000;

  it('sums UTC days the range covers from their start, today last', () => {
    const volumes = binnedVolumes(
      [
        hour(TODAY - 2 * DAY - 3600, 1, 100, 100), // the day the range starts in, only partly covered
        hour(TODAY - 2 * DAY, 1, 1, 2),
        hour(TODAY - 2 * DAY + 3600, 1, 3, 4),
        hour(TODAY + 16 * 3600, 1, 10, 20),
      ],
      NOW,
      3 * DAY,
      'day',
    );

    expect(volumes).toEqual([
      { start: ms(TODAY - 2 * DAY), bought: 6, sold: 4 },
      { start: ms(TODAY - DAY), bought: 0, sold: 0 },
      { start: ms(TODAY), bought: 20, sold: 10 },
    ]);
  });

  it('sums UTC months, this month last', () => {
    const volumes = binnedVolumes(
      [
        hour(Date.UTC(2025, 9, 20) / 1000, 1, 100, 100), // October 2025, only partly in the year
        hour(Date.UTC(2025, 10, 1) / 1000, 1, 1, 2),
        hour(Date.UTC(2026, 9, 6) / 1000, 1, 3, 4),
      ],
      NOW,
      365 * DAY,
      'month',
    );

    expect(volumes).toHaveLength(12);
    expect(volumes[0]).toEqual({ start: Date.UTC(2025, 10, 1), bought: 2, sold: 1 });
    expect(volumes.at(-1)).toEqual({ start: Date.UTC(2026, 9, 1), bought: 4, sold: 3 });
  });

  it('sums the hours of a day, this hour last', () => {
    const fiveMinutes = (offset: number, sold: number) => hour(TODAY + 17 * 3600 + offset, 1, sold);
    const volumes = binnedVolumes([fiveMinutes(0, 1), fiveMinutes(300, 2)], NOW, DAY, 'hour');

    expect(volumes).toHaveLength(24);
    expect(volumes.at(-1)).toEqual({ start: ms(TODAY + 17 * 3600), bought: 0, sold: 3 });
  });
});

describe('yesterdayAverageSellPrice', () => {
  it("weighs yesterday's hourly sell prices by their volume", () => {
    const average = yesterdayAverageSellPrice(
      [
        hour(TODAY - DAY - 3600, 9_999, 50), // the day before
        hour(TODAY - DAY, 100, 1),
        hour(TODAY - DAY + 3600, 200, 3),
        hour(TODAY, 9_999, 50), // today
      ],
      NOW,
    );

    expect(average).toBe(175);
  });

  it('is null without trades yesterday', () => {
    expect(yesterdayAverageSellPrice([hour(TODAY, 100, 1)], NOW)).toBeNull();
  });
});

describe('itemStats', () => {
  const WHIP = { id: 4151, name: 'Abyssal whip', limit: 70, highalch: 72_000, lowalch: 48_000 } as Item;
  const BOND = { id: 13190, name: 'Old school bond', limit: 100, highalch: 0, lowalch: 0 } as Item;
  const TRADE_TIME = new Date(NOW.getTime() - 120_000);

  const LOADED: ItemStatsInput = {
    item: WHIP,
    latest: { high: 1_500_000, highTime: TRADE_TIME, low: 1_450_000, lowTime: TRADE_TIME },
    latestLoading: false,
    latestFailed: false,
    hourly: [
      hour(TODAY - DAY, 1, 100, 100), // more than 24 hours ago
      hour(TODAY, 1, 10, 20),
    ],
    hourlyLoading: false,
    hourlyFailed: false,
    now: NOW,
    timeAgo: () => '2 minutes ago',
  };

  const tile = (stats: ItemStat[], label: string) => stats.find(stat => stat.label === label);

  it('builds the six tiles from the latest prices, the hourly series and the item', () => {
    expect(itemStats(LOADED)).toEqual([
      {
        label: 'Instant buy',
        info: 'The price of the latest instant buy.',
        value: '1,500,000',
        sub: 'Last trade 2 min ago',
        tip: 'Last trade was 2 minutes ago.',
      },
      {
        label: 'Instant sell',
        info: 'The price of the latest instant sell.',
        value: '1,450,000',
        sub: 'Last trade 2 min ago',
        tip: 'Last trade was 2 minutes ago.',
      },
      {
        label: 'Margin after tax',
        info: 'Instant buy minus instant sell, minus the 2% GE tax on the sale.',
        value: '20,000', // 1,500,000 − 1,450,000 − 30,000 tax
        sub: 'Buy − sell − 2% tax',
        loading: false,
      },
      {
        label: 'Volume',
        info: 'The number of times the item has been traded within the last 24 hours.',
        value: '30',
        sub: 'Last 24 hours',
        loading: false,
      },
      {
        label: 'Buy limit',
        info: 'The amount of times the item can be bought every 4 hours.',
        value: '70',
        sub: 'Every 4 hours',
      },
      {
        label: 'High alch',
        info: 'Coins received from casting High Level Alchemy on the item.',
        value: '72,000',
        sub: 'Low alch 48,000',
      },
    ]);
  });

  it('shortens a low alch from 1M, with the exact value in its tooltip', () => {
    const stats = itemStats({ ...LOADED, item: { ...LOADED.item, highalch: 4_200_000, lowalch: 2_800_000 } });

    expect(tile(stats, 'High alch')).toMatchObject({
      value: '4,200,000',
      sub: 'Low alch 2.8M',
      subTip: 'Low alch 2,800,000 gp',
    });
  });

  it('shows a failed price load on the price tiles and the margin', () => {
    const stats = itemStats({ ...LOADED, latest: undefined, latestFailed: true });

    for (const label of ['Instant buy', 'Instant sell', 'Margin after tax']) {
      expect(tile(stats, label)).toMatchObject({ value: '–', sub: 'Not loaded' });
    }
  });

  it('shows the price tiles and the margin as loading', () => {
    const stats = itemStats({ ...LOADED, latest: undefined, latestLoading: true });

    for (const label of ['Instant buy', 'Instant sell', 'Margin after tax']) {
      expect(tile(stats, label)).toMatchObject({ value: '–', loading: true });
    }
  });

  it('shows a price without recent trades as a dash, and no margin', () => {
    const stats = itemStats({ ...LOADED, latest: { ...LOADED.latest!, low: 0 } });

    expect(tile(stats, 'Instant buy')?.value).toBe('1,500,000');
    expect(tile(stats, 'Instant sell')).toMatchObject({ value: '–', sub: 'No recent trades', loading: false });
    expect(tile(stats, 'Margin after tax')?.value).toBe('–');
  });

  it('takes no tax off the margin of a tax-exempt item', () => {
    const latest = { ...LOADED.latest!, high: 12_000_000, low: 11_900_000 };
    const margin = tile(itemStats({ ...LOADED, item: BOND, latest }), 'Margin after tax');

    expect(margin).toMatchObject({
      value: '100,000',
      sub: 'No tax on this item',
      info: 'Instant buy minus instant sell. This item is exempt from GE tax.',
    });
  });

  it('caps the tax on the margin', () => {
    const latest = { ...LOADED.latest!, high: 300_000_000, low: 290_000_000 };

    // 2% of 300M is 6M, capped at 5M
    expect(tile(itemStats({ ...LOADED, latest }), 'Margin after tax')?.value).toBe('5,000,000');
  });

  it('shows a failed volume load', () => {
    const stats = itemStats({ ...LOADED, hourly: [], hourlyFailed: true });

    expect(tile(stats, 'Volume')).toMatchObject({ value: '–', sub: 'Not loaded' });
  });

  it('shortens large amounts, with the whole amount in the tip', () => {
    const latest = { ...LOADED.latest!, high: 786_705_873 };

    expect(tile(itemStats({ ...LOADED, latest }), 'Instant buy')).toMatchObject({
      value: '786.71M',
      tip: '786,705,873 gp. Last trade was 2 minutes ago.',
    });
  });
});

describe('priceChartSummary', () => {
  const point = (timestamp: number, avgHighPrice: number | null, avgLowPrice: number | null) =>
    ({ timestamp, avgHighPrice, avgLowPrice, highPriceVolume: 1, lowPriceVolume: 1 }) as AveragePricesAtTime;

  it('gives each price its first, last, low and high, skipping points without trades', () => {
    const prices = [point(1, 1_000, null), point(2, 1_250, 900), point(3, null, 1_100), point(4, 1_200, 950)];

    expect(priceChartSummary(prices, 'week')).toBe(
      'Instant buy and instant sell price over the last week. ' +
        'Instant buy: 1,000 gp at the start, 1,200 gp at the end, low 1,000, high 1,250. ' +
        'Instant sell: 900 gp at the start, 950 gp at the end, low 900, high 1,100.',
    );
  });

  it('says when a price has no trades', () => {
    expect(priceChartSummary([point(1, 1_000, null)], 'day')).toContain('Instant sell: no trades.');
  });
});

describe('hasTrades', () => {
  it('is false for an empty series or one without prices', () => {
    expect(hasTrades([])).toBe(false);
    expect(hasTrades([{ timestamp: 1 } as AveragePricesAtTime])).toBe(false);
    expect(hasTrades([hour(1, 100, 1)])).toBe(true);
  });
});

describe('priceChange', () => {
  it('moves from the first trade to the last, skipping points without trades', () => {
    expect(priceChange([0, 1_000, 1_042, 0])).toEqual({ percent: '+4.2%', tone: 'up', last: '1,042' });
    expect(priceChange([6_000_000_000, 3_932_042_211])).toEqual({
      percent: '−34.5%',
      tone: 'down',
      last: '3,932,042,211',
    });
  });

  it('groups the digits of a large change', () => {
    expect(priceChange([1, 1_000])?.percent).toBe('+99,900.0%');
  });

  it('is flat when the change reads 0.0%', () => {
    expect(priceChange([100_000, 100_040])).toEqual({ percent: '0.0%', tone: 'flat', last: '100,040' });
    expect(priceChange([100_000, 99_960])).toEqual({ percent: '0.0%', tone: 'flat', last: '99,960' });
  });

  it('is nothing without trades', () => {
    expect(priceChange([0, 0])).toBeUndefined();
    expect(priceChange([])).toBeUndefined();
  });
});

describe('priceTableRows', () => {
  // local times, as the table bins in the visitor's time zone
  const at = (day: number, hour: number) => new Date(2026, 9, day, hour).getTime() / 1000;
  const point = (timestamp: number, high: [number, number] | null, low: [number, number] | null) =>
    ({
      timestamp,
      avgHighPrice: high?.[0] ?? null,
      highPriceVolume: high?.[1] ?? 0,
      avgLowPrice: low?.[0] ?? null,
      lowPriceVolume: low?.[1] ?? 0,
    }) as AveragePricesAtTime;

  it('averages each day weighted by the number traded, newest first, with a dash without trades', () => {
    const prices = [
      point(at(6, 10), [100, 1], [90, 2]),
      point(at(6, 14), [200, 3], null),
      point(at(7, 9), null, [80, 1]),
    ];

    expect(priceTableRows(prices, 'day')).toEqual([
      { key: new Date(2026, 9, 7).getTime(), cells: ['Wed 7 Oct', '—', '80'] },
      { key: new Date(2026, 9, 6).getTime(), cells: ['Tue 6 Oct', '175', '90'] },
    ]);
  });

  it('labels hours and months', () => {
    const prices = [point(at(6, 10), [100, 1], [90, 1])];
    expect(priceTableRows(prices, 'hour')[0].cells[0]).toBe('6 Oct, 10:00');
    expect(priceTableRows(prices, 'month')[0].cells[0]).toBe('October 2026');
  });
});
