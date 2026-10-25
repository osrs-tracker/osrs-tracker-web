import { AveragePrices, ItemMapping, LatestPriceList } from '@app/common/api/osrs-prices-repo';
import { formatNumberTenths, formatSign, formatWhole } from '@app/common/format/number-format';
import { geTax } from '../item-detail/ge-tax';

/** The two item tables, which share one page */
export type TableKind = 'high-alch' | 'margins';
/** Which price High alch buys at: the instant-buy price (`high`) or the instant-sell price (`low`) a buy offer pays */
export type BuyAt = 'instant-buy' | 'instant-sell';
/** The least daily trades a row needs; with `any`, old prices show too */
export type Volume = 'any' | 100 | 1000 | 10000;
export type Members = 'all' | 'members' | 'f2p';
export type SortKey = 'buy' | 'alch' | 'sell' | 'key' | 'limit' | 'perLimit' | 'volume';

export interface TableOptions {
  members: Members;
  volume: Volume;
  /** High alch only */
  buyAt: BuyAt;
  /** The name filter */
  query: string;
  sort: SortKey;
  dir: 'asc' | 'desc';
}

export interface TableRow {
  id: number;
  name: string;
  icon: string;
  members: boolean;
  /** The price paid for the item */
  buy: number;
  /** High alch: the alch value */
  alch?: number;
  /** Margins: the price the item sells at, and the GE tax on it */
  sell?: number;
  tax?: number;
  /** The profit (High alch) or the margin (Margins), per item */
  key: number;
  /** `key` on a full buy limit; `null` without a limit */
  perLimit: number | null;
  limit: number | null;
  /** Trades yesterday (UTC), both sides */
  volume: number;
  /**
   * When the price the row uses last traded, in ms (a number, not a `Date`, so a row survives `TransferState`): the side
   * picked on High alch, the older side on Margins.
   */
  tradedAt: number;
  /** High alch: the nature rune's price on the same side */
  natureRune?: number;
}

const NATURE_RUNE_ID = 561;
/** A row needs a trade this recent at the price it uses, unless the volume filter is `any`; older prices get a clock */
export const STALE_AFTER = 3_600_000;

/** The nature rune's price on the `buyAt` side; it trades all day, so a missing one is a failed load */
export function natureRunePrice(latest: LatestPriceList, buyAt: BuyAt): number {
  const price = latest[NATURE_RUNE_ID]?.[buyAt === 'instant-buy' ? 'high' : 'low'];
  if (!price) throw new Error('The nature rune has no price');
  return price;
}

/**
 * Every row of a table, unfiltered. High alch skips items without an alch value or a price on the picked side, Margins
 * items without a price on both sides.
 */
export function buildRows(
  kind: TableKind,
  buyAt: BuyAt,
  mapping: ItemMapping[],
  latest: LatestPriceList,
  day: Record<string, AveragePrices>,
): TableRow[] {
  const natureRune = kind === 'high-alch' ? natureRunePrice(latest, buyAt) : 0;
  const side = buyAt === 'instant-buy' ? 'high' : 'low';

  return mapping.flatMap(({ id, name, icon, members, highalch, limit }): TableRow[] => {
    const price = latest[id];
    const base = {
      id,
      name,
      icon,
      members,
      limit: limit || null,
      volume: (day[id]?.highPriceVolume ?? 0) + (day[id]?.lowPriceVolume ?? 0),
    };

    if (kind === 'high-alch') {
      const buy = price?.[side];
      if (!highalch || !buy) return [];
      const key = highalch - buy - natureRune;
      return [
        {
          ...base,
          buy,
          alch: highalch,
          key,
          perLimit: perLimit(key, limit),
          tradedAt: price[`${side}Time`] * 1000,
          natureRune,
        },
      ];
    }

    // Buy from sellers at the instant-sell price, sell to buyers at the instant-buy price
    const { high, low, highTime, lowTime } = price ?? {};
    if (!high || !low) return [];
    const tax = geTax(id, high);
    const key = high - low - tax;
    return [
      {
        ...base,
        buy: low,
        sell: high,
        tax,
        key,
        perLimit: perLimit(key, limit),
        tradedAt: Math.min(highTime, lowTime) * 1000,
      },
    ];
  });
}

function perLimit(key: number, limit: number | undefined): number | null {
  return limit ? key * limit : null;
}

/** Whether the row's price is too old to trust: shown with a clock when the volume filter lets it in */
export function isStale(row: TableRow, now: number): boolean {
  return now - row.tradedAt > STALE_AFTER;
}

/**
 * The rows that pass the filters, sorted: by membership, then volume (and a recent trade, unless `any`), then name.
 * Rows without the sorted value (no buy limit) go last either way; ties sort by name.
 */
export function viewRows(rows: TableRow[], options: TableOptions, now: number): TableRow[] {
  const query = options.query.trim().toLowerCase();
  const { members, volume, sort, dir } = options;
  const sign = dir === 'desc' ? -1 : 1;

  return rows
    .filter(
      row =>
        (members === 'all' || row.members === (members === 'members')) &&
        (volume === 'any' || (row.volume >= volume && !isStale(row, now))) &&
        (!query || row.name.toLowerCase().includes(query)),
    )
    .sort((a, b) => {
      const x = a[sort] ?? null;
      const y = b[sort] ?? null;
      if (x !== y) {
        if (x === null) return 1;
        if (y === null) return -1;
        return sign * (x - y);
      }
      return a.name.localeCompare(b.name);
    });
}

export function defaultOptions(kind: TableKind): TableOptions {
  return {
    members: 'all',
    volume: 1000,
    buyAt: 'instant-buy',
    query: '',
    sort: kind === 'high-alch' ? 'key' : 'perLimit',
    dir: 'desc',
  };
}

/** Each table's columns, in order */
const TABLE_COLUMNS: Record<TableKind, SortKey[]> = {
  'high-alch': ['buy', 'alch', 'key', 'limit', 'perLimit', 'volume'],
  'margins': ['buy', 'sell', 'key', 'limit', 'perLimit', 'volume'],
};

const MEMBERS: Members[] = ['all', 'members', 'f2p'];
const VOLUMES: Volume[] = ['any', 100, 1000, 10000];
const BUY_AT: BuyAt[] = ['instant-buy', 'instant-sell'];

/** A sort key as the URL writes it: the key column by its label */
function sortParam(kind: TableKind, sort: SortKey): string {
  if (sort === 'key') return kind === 'high-alch' ? 'profit' : 'margin';
  return sort === 'perLimit' ? 'per-limit' : sort;
}

/**
 * The options as query params, `null` for a default, so the default view keeps a bare URL:
 * `?q=rune&members=f2p&volume=any&buy-at=instant-sell&sort=per-limit&dir=asc`
 */
export function optionsToParams(
  kind: TableKind,
  options: TableOptions,
): Record<'q' | 'members' | 'volume' | 'buy-at' | 'sort' | 'dir', string | null> {
  const defaults = defaultOptions(kind);
  const unlessDefault = <K extends keyof TableOptions>(key: K, value = String(options[key])): string | null =>
    options[key] === defaults[key] ? null : value;
  return {
    'q': options.query.trim() || null,
    'members': unlessDefault('members'),
    'volume': unlessDefault('volume'),
    'buy-at': kind === 'high-alch' ? unlessDefault('buyAt') : null,
    'sort': unlessDefault('sort', sortParam(kind, options.sort)),
    'dir': unlessDefault('dir'),
  };
}

/** The options from query params; a missing or unknown value (`?sort=abc`) reads as the default */
export function optionsFromParams(kind: TableKind, params: { get(name: string): string | null }): TableOptions {
  const defaults = defaultOptions(kind);
  const pick = <T>(values: T[], param: string | null, fallback: T): T =>
    values.find(value => String(value) === param) ?? fallback;
  return {
    query: params.get('q') ?? defaults.query,
    members: pick(MEMBERS, params.get('members'), defaults.members),
    volume: pick(VOLUMES, params.get('volume'), defaults.volume),
    buyAt: kind === 'high-alch' ? pick(BUY_AT, params.get('buy-at'), defaults.buyAt) : defaults.buyAt,
    sort: TABLE_COLUMNS[kind].find(sort => sortParam(kind, sort) === params.get('sort')) ?? defaults.sort,
    dir: pick<TableOptions['dir']>(['asc', 'desc'], params.get('dir'), defaults.dir),
  };
}

/**
 * A table value short enough for its column: in full below 10,000 ("9,999", "−420"), then compact with one decimal
 * ("12.0K", "195.5M", "−1.2B"), so a column reads evenly. `signed` adds a plus to gains ("+24.8K").
 * `formatWholeCompact` switches at 10M, too late here.
 */
export function formatTableNumber(value: number, signed = false): string {
  const abs = Math.abs(Math.round(value));
  if (abs < 10_000) return formatWhole(value, signed);
  return formatSign(value, signed ? 'exceptZero' : 'negative') + formatNumberTenths(abs);
}
