import { describe, expect, it } from 'vitest';
import { RANGE_OPTIONS } from './price-ranges';

describe('RANGE_OPTIONS', () => {
  it('offers every range and titles each for its button', () => {
    expect(RANGE_OPTIONS.map(option => option.value)).toEqual(['1D', '1W', '1M', '1Y']);
    expect(RANGE_OPTIONS[1]).toEqual({ value: '1W', label: '1W', title: 'Last week' });
  });
});
