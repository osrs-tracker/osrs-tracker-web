import { ActivityEnum, SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreEntry } from '@osrs-tracker/models';
import { describe, expect, it } from 'vitest';
import { activitySeries, xpGainedSeries } from './log-chart-series';

const diff = (day: number, skills: Record<string, number>, activities: Record<string, number> = {}): HiscoreEntry =>
  ({
    date: new Date(2026, 9, day),
    skills: Object.entries(skills).map(([name, xp]) => ({ name, xp, level: 0, rank: 0 })),
    activities: Object.entries(activities).map(([name, score]) => ({ name, score, rank: 0 })),
  }) as HiscoreEntry;

describe('xpGainedSeries', () => {
  it('adds up the daily gains oldest first, without Overall or skills that gained nothing', () => {
    // Newest first, like the logs
    const diffs = [
      diff(3, { [SkillEnum.Overall]: 300, [SkillEnum.Attack]: 100, [SkillEnum.Magic]: 200 }),
      diff(2, { [SkillEnum.Overall]: 0, [SkillEnum.Attack]: 0, [SkillEnum.Magic]: 0 }),
      diff(1, { [SkillEnum.Overall]: 50, [SkillEnum.Attack]: 50, [SkillEnum.Magic]: 0, [SkillEnum.Cooking]: -1 }),
    ];

    expect(xpGainedSeries(diffs).map(({ name, total, points }) => [name, total, points.map(p => p.y)])).toEqual([
      [SkillEnum.Magic, 200, [0, 0, 200]],
      [SkillEnum.Attack, 150, [50, 50, 150]],
    ]);
  });
});

describe('activitySeries', () => {
  it('keeps the activities of the category that have a score, largest first', () => {
    const category = new Set([ActivityEnum.Zulrah, ActivityEnum.Vorkath, ActivityEnum.Kraken]);
    const diffs = [
      diff(
        2,
        {},
        {
          [ActivityEnum.Zulrah]: 5,
          [ActivityEnum.Vorkath]: 1,
          [ActivityEnum.Kraken]: 2,
          [ActivityEnum.SoulWarsZeal]: 900,
        },
      ),
      diff(1, {}, { [ActivityEnum.Zulrah]: 5, [ActivityEnum.Vorkath]: 1, [ActivityEnum.Kraken]: 0 }),
    ];

    expect(
      activitySeries(diffs, category).map(({ name, total, points }) => [name, total, points.map(p => p.y)]),
    ).toEqual([
      [ActivityEnum.Zulrah, 10, [5, 5]],
      [ActivityEnum.Vorkath, 2, [1, 1]],
      [ActivityEnum.Kraken, 2, [0, 2]],
    ]);
  });
});
