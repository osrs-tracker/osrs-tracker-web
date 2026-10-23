import { describe, expect, it } from 'vitest';
import { ItemMapping } from '@app/common/api/osrs-prices-repo';
import {
  buildRows,
  defaultOptions,
  formatTableNumber,
  optionsFromParams,
  optionsToParams,
  TableOptions,
  viewRows,
} from './price-table';

// From the Wiki's prices on 17 Oct 2026 (the design's data): times in Unix seconds, `now` a minute after the last trade
const now = 1_792_243_860_000;
const t = now / 1000 - 60;

const mapping: ItemMapping[] = [
  { id: 561, name: 'Nature rune', icon: 'Nature rune.png', members: false, highalch: 108, limit: 18000 },
  { id: 1149, name: 'Dragon med helm', icon: 'Dragon med helm.png', members: true, highalch: 60000, limit: 8 },
  { id: 1127, name: 'Rune platebody', icon: 'Rune platebody.png', members: false, highalch: 39000, limit: 70 },
  { id: 13190, name: 'Old school bond', icon: 'Old school bond.png', members: false, limit: 100 },
  { id: 9999, name: 'No limit', icon: 'x.png', members: true, highalch: 2000 },
];
const latest = {
  561: { high: 143, highTime: t, low: 141, lowTime: t },
  1149: { high: 58532, highTime: t, low: 58512, lowTime: t },
  1127: { high: 38517, highTime: t, low: 38344, lowTime: t - 3 * 3600 },
  13190: { high: 11_600_000, highTime: t, low: 11_440_000, lowTime: t },
  9999: { high: 1000, highTime: t, low: 990, lowTime: t },
};
const day = {
  561: { avgHighPrice: 0, avgLowPrice: 0, highPriceVolume: 20_000_000, lowPriceVolume: 10_000_000 },
  1149: { avgHighPrice: 0, avgLowPrice: 0, highPriceVolume: 20_000, lowPriceVolume: 4_766 },
  1127: { avgHighPrice: 0, avgLowPrice: 0, highPriceVolume: 100_000, lowPriceVolume: 48_177 },
  13190: { avgHighPrice: 0, avgLowPrice: 0, highPriceVolume: 5_000, lowPriceVolume: 5_899 },
  9999: { avgHighPrice: 0, avgLowPrice: 0, highPriceVolume: 50, lowPriceVolume: 0 },
};

const paramMap = (params: Record<string, string | null>) => ({ get: (name: string) => params[name] ?? null });
const options = (kind: 'high-alch' | 'margins', changes: Partial<TableOptions> = {}): TableOptions => ({
  ...defaultOptions(kind),
  ...changes,
});
const names = (rows: { name: string }[]) => rows.map(row => row.name);

describe('price tables', () => {
  it('works out high-alch profit at the instant-buy price, the rune included', () => {
    const helm = buildRows('high-alch', 'instant-buy', mapping, latest, day).find(row => row.id === 1149);
    expect(helm).toMatchObject({
      buy: 58532,
      alch: 60000,
      natureRune: 143,
      key: 1325,
      perLimit: 10_600,
      volume: 24_766,
    });
  });

  it('uses the instant-sell price for both the item and the rune', () => {
    const body = buildRows('high-alch', 'instant-sell', mapping, latest, day).find(row => row.id === 1127);
    expect(body).toMatchObject({ buy: 38344, natureRune: 141, key: 39000 - 38344 - 141 });
    expect(body?.tradedAt).toBe((t - 3 * 3600) * 1000);
  });

  it('takes the GE tax off a margin, except on tax-free items', () => {
    const rows = buildRows('margins', 'instant-buy', mapping, latest, day);
    expect(rows.find(row => row.id === 1149)).toMatchObject({ buy: 58512, sell: 58532, tax: 1170, key: -1150 });
    expect(rows.find(row => row.id === 13190)).toMatchObject({ tax: 0, key: 160_000, perLimit: 16_000_000 });
    // Margins lists items without an alch value; the older side's time counts
    expect(rows.find(row => row.id === 1127)?.tradedAt).toBe((t - 3 * 3600) * 1000);
  });

  it('fails without a nature rune price', () => {
    expect(() => buildRows('high-alch', 'instant-buy', mapping, { ...latest, 561: {} }, day)).toThrow();
  });

  it('hides rarely traded items and old prices, unless the volume is any', () => {
    const rows = buildRows('margins', 'instant-buy', mapping, latest, day);
    expect(names(viewRows(rows, options('margins'), now))).toEqual([
      'Old school bond',
      'Nature rune',
      'Dragon med helm',
    ]);
    expect(viewRows(rows, options('margins', { volume: 'any' }), now)).toHaveLength(5);
    expect(names(viewRows(rows, options('margins', { volume: 10000 }), now))).toEqual([
      'Old school bond',
      'Nature rune',
      'Dragon med helm',
    ]);
  });

  it('filters by membership and by name', () => {
    const rows = buildRows('high-alch', 'instant-buy', mapping, latest, day);
    expect(names(viewRows(rows, options('high-alch', { members: 'members', volume: 'any' }), now))).toEqual([
      'Dragon med helm',
      'No limit',
    ]);
    expect(names(viewRows(rows, options('high-alch', { members: 'f2p', volume: 'any' }), now))).toEqual([
      'Rune platebody',
      'Nature rune',
    ]);
    expect(names(viewRows(rows, options('high-alch', { query: ' RUNE ', volume: 'any' }), now))).toEqual([
      'Rune platebody',
      'Nature rune',
    ]);
  });

  it('sorts rows without a buy limit last either way, and ties by name', () => {
    const rows = buildRows('high-alch', 'instant-buy', mapping, latest, day);
    const byLimit = (dir: 'asc' | 'desc') =>
      names(viewRows(rows, options('high-alch', { sort: 'perLimit', dir, volume: 'any' }), now));
    expect(byLimit('desc').at(-1)).toBe('No limit');
    expect(byLimit('asc').at(-1)).toBe('No limit');

    const tied = rows.map(row => ({ ...row, key: 1 }));
    expect(names(viewRows(tied, options('high-alch', { volume: 'any' }), now))).toEqual([
      'Dragon med helm',
      'Nature rune',
      'No limit',
      'Rune platebody',
    ]);
  });

  it('writes numbers in full below 10,000 and with one decimal from there', () => {
    expect(formatTableNumber(9_999)).toBe('9,999');
    expect(formatTableNumber(-420)).toBe('−420');
    expect(formatTableNumber(12_000)).toBe('12.0K');
    expect(formatTableNumber(24_766)).toBe('24.8K');
    expect(formatTableNumber(195_450_000)).toBe('195.5M');
    expect(formatTableNumber(-1_150_000)).toBe('−1.2M');
    expect(formatTableNumber(7_824, true)).toBe('+7,824');
    expect(formatTableNumber(13_300, true)).toBe('+13.3K');
    expect(formatTableNumber(0, true)).toBe('0');
  });

  it('keeps the options in query params, the defaults left out', () => {
    expect(optionsToParams('margins', defaultOptions('margins'))).toEqual({
      'q': null,
      'members': null,
      'volume': null,
      'buy-at': null,
      'sort': null,
      'dir': null,
    });

    const picked = options('high-alch', {
      query: 'rune',
      members: 'f2p',
      volume: 'any',
      buyAt: 'instant-sell',
      sort: 'perLimit',
      dir: 'asc',
    });
    const params = optionsToParams('high-alch', picked);
    expect(params).toEqual({
      'q': 'rune',
      'members': 'f2p',
      'volume': 'any',
      'buy-at': 'instant-sell',
      'sort': 'per-limit',
      'dir': 'asc',
    });
    expect(optionsFromParams('high-alch', paramMap(params))).toEqual(picked);
    expect(optionsToParams('margins', options('margins', { sort: 'key' })).sort).toBe('margin');
    expect(optionsToParams('high-alch', options('high-alch', { sort: 'volume' })).sort).toBe('volume');
  });

  it('reads a missing or unknown param as the default', () => {
    const params = paramMap({
      'members': 'everyone',
      'volume': '5',
      'sort': 'alch',
      'dir': 'up',
      'buy-at': 'instant-sell',
    });
    // Margins has no Alch value column and no Buy at choice
    expect(optionsFromParams('margins', params)).toEqual(defaultOptions('margins'));
  });
});
