import { describe, expect, it } from 'vitest';
import { AveragePrices, ItemMapping } from '@app/common/api/osrs-prices-repo';
import { buildPriceMovers } from './price-movers';

const item = (id: number): ItemMapping => ({ id, name: `Item ${id}`, icon: `${id}.png`, members: false });

const traded = (price: number, volume = 100_000): AveragePrices => ({
  avgHighPrice: price,
  highPriceVolume: volume / 2,
  avgLowPrice: price,
  lowPriceVolume: volume / 2,
});

describe('buildPriceMovers', () => {
  it('ranks by percentage, not gp, each way', () => {
    const { rising, falling } = buildPriceMovers(
      [item(1), item(2), item(3), item(4)],
      { 1: traded(1_100), 2: traded(300), 3: traded(900), 4: traded(100) },
      { 1: traded(1_000), 2: traded(200), 3: traded(1_000), 4: traded(200) },
    );

    expect(rising.map(mover => mover.id)).toEqual([2, 1]);
    expect(falling.map(mover => mover.id)).toEqual([4, 3]);
    expect(rising[0]).toEqual({ id: 2, name: 'Item 2', icon: '2.png', from: 200, to: 300 });
  });

  it('leaves out an item that didn’t move', () => {
    const { rising, falling } = buildPriceMovers([item(1)], { 1: traded(1_000) }, { 1: traded(1_000) });

    expect(rising).toEqual([]);
    expect(falling).toEqual([]);
  });

  it('needs 10M gp traded on both days', () => {
    const { rising } = buildPriceMovers(
      [item(1), item(2), item(3)],
      { 1: traded(1_000, 10_000), 2: traded(1_000, 9_999), 3: traded(2_000, 10_000) },
      { 1: traded(500, 20_000), 2: traded(500, 20_000), 3: traded(1_000, 9_999) },
    );

    expect(rising.map(mover => mover.id)).toEqual([1]);
  });

  it('doesn’t let one mistyped trade count as traded value', () => {
    const fatFingered: AveragePrices = {
      avgHighPrice: 30,
      highPriceVolume: 2_500,
      avgLowPrice: 378_000,
      lowPriceVolume: 2_500,
    };

    const { falling } = buildPriceMovers([item(1)], { 1: fatFingered }, { 1: traded(300_000) });

    expect(falling).toEqual([]);
  });

  it('needs a price of at least 100 gp on both days', () => {
    const { rising, falling } = buildPriceMovers(
      [item(1), item(2), item(3)],
      { 1: traded(200), 2: traded(99, 1_000_000), 3: traded(50, 1_000_000) },
      { 1: traded(100), 2: traded(150, 1_000_000), 3: traded(40, 1_000_000) },
    );

    expect(rising.map(mover => mover.id)).toEqual([1]);
    expect(falling).toEqual([]);
  });

  it('needs trades on both sides on both days', () => {
    const oneSided: AveragePrices = { ...traded(2_000), avgLowPrice: null!, lowPriceVolume: 0 };

    const { rising } = buildPriceMovers(
      [item(1), item(2), item(3)],
      { 1: oneSided, 2: traded(2_000) },
      { 1: traded(1_000), 3: traded(1_000) },
    );

    expect(rising).toEqual([]);
  });

  it('shows ten at most', () => {
    const ids = Array.from({ length: 12 }, (_, index) => index + 1);
    const yesterday = Object.fromEntries(ids.map(id => [id, traded(1_000 + id)]));
    const dayBefore = Object.fromEntries(ids.map(id => [id, traded(1_000)]));

    const { rising } = buildPriceMovers(ids.map(item), yesterday, dayBefore);

    expect(rising.map(mover => mover.id)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3]);
  });
});
