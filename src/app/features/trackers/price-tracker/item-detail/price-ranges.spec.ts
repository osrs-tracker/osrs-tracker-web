import { describe, expect, it } from 'vitest';
import { PriceRange, rangeOptions } from './price-ranges';

const values = (world: 'main' | 'hardcore', now: string): PriceRange[] =>
  rangeOptions(world, new Date(now)).map(option => option.value);

describe('rangeOptions', () => {
  it('offers every range on main', () => {
    expect(values('main', '2026-11-19T10:00:00Z')).toEqual(['1D', '1W', '1M', '1Y']);
  });

  it('offers Hardcore Worlds only the ranges they are old enough for', () => {
    expect(values('hardcore', '2026-11-19T10:00:00Z')).toEqual(['1D', '1W']);
  });

  it('adds the month 30 days after Hardcore Worlds opened, and the year after 365', () => {
    expect(values('hardcore', '2026-12-03T23:59:00Z')).toEqual(['1D', '1W']);
    expect(values('hardcore', '2026-12-04T00:00:00Z')).toEqual(['1D', '1W', '1M']);
    expect(values('hardcore', '2027-11-04T00:00:00Z')).toEqual(['1D', '1W', '1M', '1Y']);
  });

  it('titles each range for its button', () => {
    expect(rangeOptions('main', new Date())[1]).toEqual({ value: '1W', label: '1W', title: 'Last week' });
  });
});
