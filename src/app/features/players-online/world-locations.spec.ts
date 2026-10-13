import { describe, expect, it } from 'vitest';
import { formatShare, locationCounts, locationCountsInOrder } from './world-locations';

describe('locationCounts', () => {
  it('names the known codes largest first and sums the unknown ones last', () => {
    const counts = locationCounts({ '1': 200, '0': 500, '99': 3, '98': 4, '12': 7 });

    expect(counts.map(({ key, name, players }) => [key, name, players])).toEqual([
      ['0', 'United States', 500],
      ['1', 'United Kingdom', 200],
      ['12', 'South Africa', 7],
      ['other', 'Other locations', 7],
    ]);
    expect(counts[0].flag).toBe('/assets/icons/flags/us.png');
    expect(counts[3].flag).toBeUndefined();
  });

  it('keeps a given order, with keys missing from it last', () => {
    const counts = locationCountsInOrder({ '0': 500, '1': 900, '7': 100, '3': 50 }, ['0', '1', '3']);

    expect(counts.map(count => count.key)).toEqual(['0', '1', '3', '7']);
  });
});

describe('formatShare', () => {
  it('rounds to a whole percentage and shows a sliver as <1%', () => {
    expect(formatShare(92_260, 100_000)).toBe('92%');
    expect(formatShare(263, 108_882)).toBe('<1%');
    expect(formatShare(0, 100)).toBe('0%');
    expect(formatShare(5, 0)).toBe('0%');
  });
});
