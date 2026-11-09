import { describe, expect, it } from 'vitest';
import { frozenPoints, isFrozen } from './frozen-count';

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

describe('frozenPoints', () => {
  const sample = (minute: number, total: number) => ({
    ...counts,
    date: new Date(2026, 10, 9, 17, minute),
    total,
  });
  const points = [sample(5, 100), sample(15, 90), sample(25, 90), sample(35, 90), sample(45, 120)];

  it('marks a sample that repeats the one before, on 24h and 7D only', () => {
    expect(frozenPoints('24h', points)).toEqual([false, false, true, true, false]);
    expect(frozenPoints('7d', points)).toEqual([false, false, true, true, false]);
    expect(frozenPoints('30d', points)).toEqual([false, false, false, false, false]);
  });
});
