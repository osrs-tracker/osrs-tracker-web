import { HiscoreEntry, SkillEnum } from '@osrs-tracker/models';
import { describe, expect, it } from 'vitest';
import { progressRun } from './progress-run';

const DAY = 24 * 60 * 60 * 1000;
const checked = (daysAgo: number): Date => new Date(Date.UTC(2026, 10, 4) - daysAgo * DAY);

const entry = (overall: number, daysAgo = 0, attack = 0): HiscoreEntry => ({
  date: checked(daysAgo),
  scrapingOffset: 0,
  skills: {
    [SkillEnum.Overall]: { xp: overall, level: 1000, rank: 1 },
    [SkillEnum.Attack]: { xp: attack, level: 50, rank: 1 },
  },
  activities: {},
});
const live = (overall: number): HiscoreEntry => ({ ...entry(overall), date: new Date(Date.UTC(2026, 10, 4, 15)) });

describe('progressRun', () => {
  it('keeps the whole history without a reset', () => {
    const history = [entry(3_000, 0), entry(2_000, 1), entry(1_000, 2)];
    expect(progressRun(history, live(3_500))).toEqual({ entries: history });
  });

  it('starts at the first check after a reset 5 days ago', () => {
    const history = [8, 6, 4, 2, 1].map((k, i) => entry(k * 1_000, i)).concat(entry(100_000_000, 5), entry(99e6, 6));
    expect(progressRun(history, live(9_000))).toEqual({ entries: history.slice(0, 5), resetAt: checked(4) });
  });

  it('has no stored entries when the reset came after the last check', () => {
    const history = [entry(100_000_000, 0), entry(99_000_000, 1)];
    expect(progressRun(history, live(1_500))).toEqual({ entries: [], resetAt: live(1_500).date });
  });

  it('starts at the newest of two resets', () => {
    const history = [entry(2_000, 0), entry(50_000, 1), entry(1_200, 2), entry(80_000, 3), entry(70_000, 4)];
    expect(progressRun(history, live(3_000))).toEqual({ entries: history.slice(0, 1), resetAt: checked(0) });
  });

  it('works on the stored history alone, without the live entry', () => {
    const history = [entry(2_000, 0), entry(1_200, 1), entry(80_000, 2)];
    expect(progressRun(history)).toEqual({ entries: history.slice(0, 2), resetAt: checked(1) });
    expect(progressRun(history, history[0])).toEqual({ entries: history.slice(0, 2), resetAt: checked(1) });
  });

  it.each([
    ['a 2% rollback', [entry(98_000_000, 0), entry(100_000_000, 1)], live(98_100_000)],
    ['a live entry 3k below the stored check', [entry(1_000_000, 0), entry(900_000, 1)], live(997_000)],
    ['a -10M correction to one skill', [entry(90_000_000, 0, 0), entry(100_000_000, 1, 10_000_000)], live(9e7)],
  ])("doesn't cut at %s", (_, history, today) => {
    expect(progressRun(history, today)).toEqual({ entries: history });
  });

  it('ignores an unranked Overall (-1) in the older check', () => {
    const history = [entry(2_000, 0), entry(-1, 1)];
    expect(progressRun(history, live(2_000))).toEqual({ entries: history });
  });
});
