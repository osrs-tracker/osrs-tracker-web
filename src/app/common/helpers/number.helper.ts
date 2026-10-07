const UNITS = [
  { value: 1e9, symbol: 'B' },
  { value: 1e6, symbol: 'M' },
  { value: 1e3, symbol: 'K' },
];

/** A short number with up to two decimals: 1.61B, 1.4M, 2.54K; below 1,000 it stays as is. */
export function formatNumberLegible(num: number): string {
  const round = (value: number): number => parseFloat(value.toFixed(2));

  for (let i = 0; i < UNITS.length; i++) {
    if (Math.abs(num) < UNITS[i].value) continue;

    const short = round(num / UNITS[i].value);
    // 999,999 rounds to 1000K, which is 1M
    if (Math.abs(short) >= 1000 && i > 0) return round(num / UNITS[i - 1].value) + UNITS[i - 1].symbol;
    return short + UNITS[i].symbol;
  }

  return String(round(num));
}
