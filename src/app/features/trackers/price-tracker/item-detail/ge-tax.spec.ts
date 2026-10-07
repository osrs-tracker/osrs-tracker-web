import { describe, expect, it } from 'vitest';
import { breakEvenSellPrice, geTax } from './ge-tax';

const WHIP = 4151;
const BOND = 13190;

describe('geTax', () => {
  it('takes 2%, rounded down', () => {
    expect(geTax(WHIP, 1_410_000)).toBe(28_200);
    expect(geTax(WHIP, 149)).toBe(2);
    expect(geTax(WHIP, 350)).toBe(7);
  });

  it('charges nothing below 50 gp', () => {
    expect(geTax(WHIP, 49)).toBe(0);
    expect(geTax(WHIP, 50)).toBe(1);
  });

  it('caps the tax at 5M per item', () => {
    expect(geTax(WHIP, 250_000_000)).toBe(5_000_000);
    expect(geTax(WHIP, 3_000_000_000)).toBe(5_000_000);
  });

  it('charges nothing on exempt items', () => {
    expect(geTax(BOND, 10_000_000)).toBe(0);
  });
});

describe('breakEvenSellPrice', () => {
  it('is the lowest price that returns the buy price after tax', () => {
    for (const buy of [1, 49, 50, 98, 99, 1_398_000, 244_999_999, 245_000_000, 3_000_000_000]) {
      const price = breakEvenSellPrice(WHIP, buy);
      expect(price - geTax(WHIP, price)).toBeGreaterThanOrEqual(buy);
      expect(price - 1 - geTax(WHIP, price - 1)).toBeLessThan(buy);
    }
  });

  it('is the buy price itself for exempt items', () => {
    expect(breakEvenSellPrice(BOND, 10_000_000)).toBe(10_000_000);
  });
});
