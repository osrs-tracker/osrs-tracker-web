import { ActivityEnum, HiscoreActivity, HiscoreEntry, HiscoreSkill, SkillEnum } from '@osrs-tracker/models';
import { describe, expect, it } from 'vitest';
import { activityRows, skillRows } from './compare-rows';

const entry = (
  skills: Record<string, HiscoreSkill | null>,
  activities: Record<string, HiscoreActivity | null> = {},
): HiscoreEntry => ({ date: new Date(), scrapingOffset: 0, skills, activities });

describe('skillRows', () => {
  const older = entry({
    [SkillEnum.Overall]: { level: 1500, xp: 40_000_000, rank: 120_000 },
    [SkillEnum.Attack]: { level: 90, xp: 5_346_332, rank: 200_000 },
    [SkillEnum.Sailing]: null,
  });
  const newer = entry({
    [SkillEnum.Overall]: { level: 1510, xp: 41_000_000, rank: 118_500 },
    [SkillEnum.Attack]: { level: 91, xp: 5_902_831, rank: 210_000 },
    [SkillEnum.Sailing]: { level: 20, xp: 4470, rank: null },
  });

  it('compares every skill, Overall first, with places climbed as a positive rank change', () => {
    const rows = skillRows(newer, older);
    expect(rows[0]).toEqual({
      name: SkillEnum.Overall,
      from: 1500,
      to: 1510,
      xp: 41_000_000,
      gained: 1_000_000,
      rank: 118_500,
      rankChange: 1500,
    });
    expect(rows.find(row => row.name === SkillEnum.Attack)).toMatchObject({ gained: 556_499, rankChange: -10_000 });
    // untrained before, unranked now: level 1 to 20, no rank to compare
    expect(rows.find(row => row.name === SkillEnum.Sailing)).toMatchObject({
      from: 1,
      to: 20,
      gained: 4470,
      rank: null,
      rankChange: undefined,
    });
  });

  it('shows XP that went down as a negative gain, as activities do', () => {
    const dropped = entry({ [SkillEnum.Attack]: { level: 90, xp: 5_300_000, rank: 210_000 } });
    expect(skillRows(dropped, older).find(row => row.name === SkillEnum.Attack)?.gained).toBe(-46_332);
  });

  it('shows one day without the comparison', () => {
    expect(skillRows(newer)[0]).toEqual({ name: SkillEnum.Overall, to: 1510, xp: 41_000_000, rank: 118_500 });
  });
});

describe('activityRows', () => {
  it('lists the activities with a score on either day, in the hiscores order', () => {
    const older = entry({}, { [ActivityEnum.Zulrah]: { score: 50, rank: 9000 } });
    const newer = entry(
      {},
      { [ActivityEnum.Vorkath]: { score: 5, rank: null }, [ActivityEnum.Zulrah]: { score: 60, rank: 8000 } },
    );

    expect(activityRows(newer, older)).toEqual([
      { name: ActivityEnum.Vorkath, from: 0, to: 5, gained: 5, rank: null, rankChange: undefined },
      { name: ActivityEnum.Zulrah, from: 50, to: 60, gained: 10, rank: 8000, rankChange: 1000 },
    ]);
  });
});
