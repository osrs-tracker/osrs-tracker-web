const legible = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });
const short = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** Intl writes -0, and a negative number that rounds to 0, as "-0" (chart axes can have a -0 tick) */
const format = (formatter: Intl.NumberFormat, num: number): string => formatter.format(num).replace(/^-0$/, '0');

/** A short number with up to two decimals: 1.61B, 1.4M, 2.54K; below 1,000 it stays as is. */
export function formatNumberLegible(num: number): string {
  return format(legible, num);
}

/** A short number with up to one decimal: 18.2K, 1.4M; below 1,000 it stays as is. */
export function formatNumberShort(num: number): string {
  return format(short, num);
}

/**
 * The sign before a number as the design writes it: a true minus ("−") below zero, where Intl and DecimalPipe write a
 * hyphen-minus. When it adds a plus, as Intl's `signDisplay` names it: never (`negative`), above zero (`exceptZero`:
 * "+12" but "0") or from zero up (`always`: "+0", for a change of nothing).
 */
export function formatSign(value: number, display: 'negative' | 'exceptZero' | 'always' = 'negative'): string {
  if (value < 0) return '−';
  return display === 'always' || (display === 'exceptZero' && value > 0) ? '+' : '';
}

/** A whole number as written in the design: "1,398,000", "−8,402" with a true minus, "+12,000" when `signed` */
export function formatWhole(value: number, signed = false): string {
  // the sign of the rounded number, so −0.4 is "0", not "−0"
  const whole = Math.round(value);
  return formatSign(whole, signed ? 'exceptZero' : 'negative') + Math.abs(whole).toLocaleString('en-US');
}

/**
 * A whole number short enough for a compact stat tile on a 390px phone, which fits nine characters: in full as
 * `formatWhole` writes it while it fits ("9,999,999", "−999,999"), otherwise as the item lists write prices, rounded to
 * two decimals with a true minus ("786.71M", "−1.76M", "2.15B").
 */
export function formatWholeCompact(value: number): string {
  const whole = Math.round(value);
  if (whole < 10_000_000 && whole > -1_000_000) return formatWhole(whole);
  return formatSign(whole) + formatNumberLegible(Math.abs(whole));
}
