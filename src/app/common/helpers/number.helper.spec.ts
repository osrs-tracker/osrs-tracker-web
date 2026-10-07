import { describe, expect, it } from 'vitest';
import { formatNumberLegible } from './number.helper';

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

  it('moves up a unit when rounding reaches 1,000', () => {
    expect(formatNumberLegible(999_999)).toBe('1M');
    expect(formatNumberLegible(999_999_999)).toBe('1B');
  });
});
