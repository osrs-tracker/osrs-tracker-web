import { describe, expect, it } from 'vitest';
import { formatNumberLegible, formatNumberShort } from './number-format';

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
