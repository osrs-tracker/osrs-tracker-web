import { PlayerCountPoint } from '@osrs-tracker/models';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fullDays, startsCounting } from './player-count-history';

/** A daily point as the component maps it: the UTC day at the viewer's midnight */
const day = (y: number, m: number, d: number): PlayerCountPoint =>
  ({ date: new Date(y, m - 1, d), total: 1, members: 1, f2p: 0, byLocation: {} }) as PlayerCountPoint;

describe('daily points', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 23, 12)));
  });
  afterEach(() => vi.useRealTimers());

  it('start with counting on All, and on 1Y while counting is younger than a year', () => {
    const points = [day(2026, 10, 13), day(2026, 10, 14)];
    expect(startsCounting('all', points)).toBe(true);
    expect(startsCounting('1y', points)).toBe(true);
    expect(startsCounting('1y', [day(2025, 10, 23), ...points])).toBe(false);
    expect(startsCounting('all', [])).toBe(false);
  });

  it('leave out today and, when counting started that day, the first', () => {
    const points = [day(2026, 10, 13), day(2026, 10, 14), day(2026, 10, 22), day(2026, 10, 23)];
    expect(fullDays(points, true).map(point => point.date.getDate())).toEqual([14, 22]);
    expect(fullDays(points, false).map(point => point.date.getDate())).toEqual([13, 14, 22]);
  });
});
