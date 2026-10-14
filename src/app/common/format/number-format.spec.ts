import { describe, expect, it } from 'vitest';
import { formatNumberLegible, formatNumberShort, formatSign, formatWhole, formatWholeCompact } from './number-format';

describe('formatNumberLegible', () => {
  it('shortens with an upper case unit and up to two decimals', () => {
    expect(formatNumberLegible(1_612_000_000)).toBe('1.61B');
    expect(formatNumberLegible(1_398_000)).toBe('1.4M');
    expect(formatNumberLegible(2_541)).toBe('2.54K');
    expect(formatNumberLegible(-8_402)).toBe('-8.4K');
  });

  it('keeps numbers below 1,000 as they are', () => {
    expect(formatNumberLegible(999)).toBe('999');
    expect(formatNumberLegible(0)).toBe('0');
  });

  it('never shows a minus sign on zero (chart ticks can be -0 or round to it)', () => {
    expect(formatNumberLegible(-0)).toBe('0');
    expect(formatNumberLegible(-0.004)).toBe('0');
  });

  it('moves up a unit when rounding reaches 1,000', () => {
    expect(formatNumberLegible(999_999)).toBe('1M');
    expect(formatNumberLegible(999_999_999)).toBe('1B');
  });
});

describe('formatNumberShort', () => {
  it('shortens with up to one decimal', () => {
    expect(formatNumberShort(18_249)).toBe('18.2K');
    expect(formatNumberShort(1_398_000)).toBe('1.4M');
  });

  it('moves up a unit when rounding reaches 1,000', () => {
    expect(formatNumberShort(999_950)).toBe('1M');
  });
});

describe('formatSign', () => {
  it('writes a true minus below zero, not a hyphen', () => {
    expect(formatSign(-1)).toBe('−');
    expect(formatSign(-1, 'exceptZero')).toBe('−');
    expect(formatSign(-1, 'always')).toBe('−');
  });

  it('writes a plus above zero only when asked', () => {
    expect(formatSign(1)).toBe('');
    expect(formatSign(1, 'exceptZero')).toBe('+');
    expect(formatSign(1, 'always')).toBe('+');
  });

  it('writes a plus on zero only with `always`', () => {
    expect(formatSign(0)).toBe('');
    expect(formatSign(0, 'exceptZero')).toBe('');
    expect(formatSign(0, 'always')).toBe('+');
  });
});

describe('formatWhole', () => {
  it('rounds and groups the thousands', () => {
    expect(formatWhole(1_398_000)).toBe('1,398,000');
    expect(formatWhole(2_540.6)).toBe('2,541');
  });

  it('writes negative numbers with a true minus', () => {
    expect(formatWhole(-8_402)).toBe('−8,402');
    expect(formatWhole(-8_402, true)).toBe('−8,402');
  });

  it('writes a plus on positive numbers when `signed`, never on zero', () => {
    expect(formatWhole(12_000, true)).toBe('+12,000');
    expect(formatWhole(12_000)).toBe('12,000');
    expect(formatWhole(0, true)).toBe('0');
  });
});

describe('formatWholeCompact', () => {
  it('writes amounts that fit in nine characters in full', () => {
    expect(formatWholeCompact(9_999_999)).toBe('9,999,999');
    expect(formatWholeCompact(-999_999)).toBe('−999,999');
    expect(formatWholeCompact(0)).toBe('0');
  });

  it('writes positive amounts from 10M with up to two decimals', () => {
    expect(formatWholeCompact(10_000_000)).toBe('10M');
    expect(formatWholeCompact(786_705_873)).toBe('786.71M');
    expect(formatWholeCompact(784_000_000)).toBe('784M');
    expect(formatWholeCompact(2_147_483_647)).toBe('2.15B');
  });

  it('writes negative amounts from 1M with a true minus', () => {
    expect(formatWholeCompact(-1_000_000)).toBe('−1M');
    expect(formatWholeCompact(-1_756_095)).toBe('−1.76M');
    expect(formatWholeCompact(-2_147_483_647)).toBe('−2.15B');
  });
});
