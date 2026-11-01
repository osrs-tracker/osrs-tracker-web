import { AveragePrices, ItemMapping } from '@app/common/api/osrs-prices-repo';

/** Unfiltered, the top of the list is items that barely trade: a Crier bell going from 1 gp to 2K on 610 trades */
const MIN_TRADED_GP = 10_000_000;
/** Below it, one gp is over 1%: Flax at about 2 gp ranked fourth on a move of under 1 gp */
const MIN_PRICE_GP = 100;
const SHOWN = 10;

export interface PriceMover extends Pick<ItemMapping, 'id' | 'name' | 'icon'> {
  /** Average price the day before yesterday, in gp */
  from: number;
  /** Average price yesterday, in gp */
  to: number;
}

export interface PriceMovers {
  rising: PriceMover[];
  falling: PriceMover[];
}

interface DayTrades {
  average: number;
  tradedGp: number;
}

/**
 * Null without trades on both sides. The cheaper side prices the traded value, as stray trades can skew one side's
 * average: Steel bolts (p++), selling at 15 gp, once averaged 378K on that side, which read as 1.8B traded.
 */
function dayTrades(prices: AveragePrices | undefined): DayTrades | null {
  if (!prices?.avgHighPrice || !prices.avgLowPrice || !prices.highPriceVolume || !prices.lowPriceVolume) return null;
  return {
    average: (prices.avgHighPrice + prices.avgLowPrice) / 2,
    tradedGp: Math.min(prices.avgHighPrice, prices.avgLowPrice) * (prices.highPriceVolume + prices.lowPriceVolume),
  };
}

export function buildPriceMovers(
  mapping: ItemMapping[],
  yesterday: Record<string, AveragePrices>,
  dayBefore: Record<string, AveragePrices>,
): PriceMovers {
  const byChange = mapping
    .flatMap(({ id, name, icon }): PriceMover[] => {
      const to = dayTrades(yesterday[id]);
      const from = dayTrades(dayBefore[id]);
      if (!to || !from || Math.min(to.tradedGp, from.tradedGp) < MIN_TRADED_GP) return [];
      if (Math.min(to.average, from.average) < MIN_PRICE_GP) return [];
      return [{ id, name, icon, from: from.average, to: to.average }];
    })
    .sort((a, b) => b.to / b.from - a.to / a.from);

  return {
    rising: byChange.filter(mover => mover.to > mover.from).slice(0, SHOWN),
    falling: byChange
      .filter(mover => mover.to < mover.from)
      .reverse()
      .slice(0, SHOWN),
  };
}
