const legible = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });
const short = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** A short number with up to two decimals: 1.61B, 1.4M, 2.54K; below 1,000 it stays as is. */
export function formatNumberLegible(num: number): string {
  return legible.format(num);
}

/** A short number with up to one decimal: 18.2K, 1.4M; below 1,000 it stays as is. */
export function formatNumberShort(num: number): string {
  return short.format(num);
}
