import { PlayerCountPoint } from '@osrs-tracker/models';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { frozenPoints, fullDays, playerCountRows, startsCounting } from './player-count-history';

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

describe('playerCountRows', () => {
  const count = (date: Date, total: number, peak?: number) => ({ ...day(2026, 1, 1), date, total, peak });

  it('averages each bin and takes its highest count, the daily peak where there is one, newest first', () => {
    const points = [
      count(new Date(2026, 9, 22, 10, 0), 100),
      count(new Date(2026, 9, 22, 10, 10), 120),
      count(new Date(2026, 9, 22, 11, 0), 90),
    ];
    expect(playerCountRows(points, 'hour').map(row => row.cells)).toEqual([
      ['22 Oct, 11:00', '90', '90'],
      ['22 Oct, 10:00', '110', '120'],
    ]);

    const days = [count(new Date(2026, 8, 30), 100, 150), count(new Date(2026, 9, 1), 200, 250)];
    expect(playerCountRows(days, 'month').map(row => row.cells)).toEqual([
      ['October 2026', '200', '250'],
      ['September 2026', '100', '150'],
    ]);
  });
});

describe('frozen points', () => {
  const sample = (minute: number, total: number) => ({
    ...day(2026, 1, 1),
    date: new Date(2026, 10, 9, 17, minute),
    total,
    members: total,
  });
  const points = [sample(5, 100), sample(15, 90), sample(25, 90), sample(35, 90), sample(45, 120)];

  it('mark a sample that repeats the one before, on 24h and 7D only', () => {
    expect(frozenPoints('24h', points)).toEqual([false, false, true, true, false]);
    expect(frozenPoints('7d', points)).toEqual([false, false, true, true, false]);
    expect(frozenPoints('30d', points)).toEqual([false, false, false, false, false]);
  });

  it('add a note to the table rows that hold one', () => {
    const rows = playerCountRows(points, 'hour', [false, false, false, false, false]);
    expect(rows.map(row => row.note)).toEqual([undefined]);
    const frozenRows = playerCountRows(points, 'hour', frozenPoints('24h', points));
    expect(frozenRows.map(row => row.note)).toEqual(['Count not updating, possibly an outage']);
  });
});
