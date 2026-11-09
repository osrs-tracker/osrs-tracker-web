import { describe, expect, it } from 'vitest';
import { isFrozen } from './frozen-count';

const counts = { total: 300, members: 200, f2p: 100, byLocation: { us: 150, gb: 100, za: 50 } };

describe('isFrozen', () => {
  it('is true when every number matches', () => {
    expect(isFrozen(counts, { ...counts, byLocation: { za: 50, us: 150, gb: 100 } })).toBe(true);
  });

  it('is false when a total, members or free-to-play differs', () => {
    expect(isFrozen(counts, { ...counts, total: 301 })).toBe(false);
    expect(isFrozen(counts, { ...counts, members: 201 })).toBe(false);
    expect(isFrozen(counts, { ...counts, f2p: 99 })).toBe(false);
  });

  it('is false when one region differs, even with the same totals', () => {
    expect(isFrozen(counts, { ...counts, byLocation: { us: 151, gb: 99, za: 50 } })).toBe(false);
  });

  it('is false when the regions differ, in either direction', () => {
    const fewer = { ...counts, byLocation: { us: 150, gb: 100 } };
    expect(isFrozen(counts, fewer)).toBe(false);
    expect(isFrozen(fewer, counts)).toBe(false);
  });
});
