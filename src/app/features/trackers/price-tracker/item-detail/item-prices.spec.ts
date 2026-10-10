import { describe, expect, it } from 'vitest';
import { DAY } from '@app/common/helpers/utc-day';
import { AveragePricesAtTime } from '@app/common/repositories/osrs-prices-repo';
import { dailyVolumes, yesterdayAverageSellPrice } from './item-prices';

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
