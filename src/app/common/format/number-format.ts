const legible = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });
const short = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const tenths = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Intl writes -0, and a negative number that rounds to 0, as "-0" (chart axes can have a -0 tick) */
const format = (formatter: Intl.NumberFormat, num: number): string => formatter.format(num).replace(/^-0$/, '0');

/** Up to two decimals; below 1,000 it stays as is. */
export function formatNumberLegible(num: number): string {
  return format(legible, num);
}

/** Up to one decimal; below 1,000 it stays as is. */
export function formatNumberShort(num: number): string {
  return format(short, num);
}

/** Exactly one decimal, so a column reads evenly */
export function formatNumberTenths(num: number): string {
  return format(tenths, num);
}

/**
 * A true minus ("−") below zero, where Intl and DecimalPipe write a hyphen-minus. `display` names when it adds a plus
 * as Intl's `signDisplay` does: `exceptZero` gives "+12" but "0", `always` gives "+0" for a change of nothing.
 */
export function formatSign(value: number, display: 'negative' | 'exceptZero' | 'always' = 'negative'): string {
  if (value < 0) return '−';
  return display === 'always' || (display === 'exceptZero' && value > 0) ? '+' : '';
}

export function formatWhole(value: number, signed = false): string {
  // the sign of the rounded number, so −0.4 is "0", not "−0"
  const whole = Math.round(value);
  return formatSign(whole, signed ? 'exceptZero' : 'negative') + Math.abs(whole).toLocaleString('en-US');
}

/** A compact stat tile on a 390px phone fits nine characters: in full while it fits, else rounded like item prices */
export function formatWholeCompact(value: number): string {
  const whole = Math.round(value);
  if (whole < 10_000_000 && whole > -1_000_000) return formatWhole(whole);
  return formatSign(whole) + formatNumberLegible(Math.abs(whole));
}

const percentTenths = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export interface PercentChange {
  percent: string;
  signed: string;
  tone: 'up' | 'down' | 'flat';
}

export function formatPercentChange(value: number, base: number): PercentChange {
  // Rounded once, so a change that reads 0.0% is also flat
  const tenths = Math.round(((value - base) / base) * 1000);
  const percent = `${percentTenths.format(Math.abs(tenths) / 10)}%`;
  return {
    percent,
    signed: formatSign(tenths, 'exceptZero') + percent,
    tone: tenths > 0 ? 'up' : tenths < 0 ? 'down' : 'flat',
  };
}
