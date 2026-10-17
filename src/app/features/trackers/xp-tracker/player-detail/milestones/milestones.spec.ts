import { calculateXPForSkillLevel, SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreEntry, HiscoreSkill } from '@osrs-tracker/models';
import { describe, expect, it } from 'vitest';
import { milestones } from './milestones';

const DAY = 24 * 60 * 60 * 1000;
const XP_99 = calculateXPForSkillLevel(99);

const skill = (level: number, xp: number): HiscoreSkill => ({ level, xp, rank: 1 });

/** An entry checked `daysAgo` with these skills; Overall gains whatever they gain */
const entry = (daysAgo: number, skills: Record<string, HiscoreSkill | null>): HiscoreEntry => ({
  date: new Date(Date.UTC(2026, 9, 17) - daysAgo * DAY),
  scrapingOffset: 0,
  skills: { [SkillEnum.Overall]: skill(2000, 300_000_000 - daysAgo), ...skills },
  activities: {},
});

describe('milestones', () => {
  // Sailing 84 gains 16K a day; Farming 98 gains 50K a day; Slayer 99 gains 100K a day; Attack gains nothing
  const now = entry(0, {
    [SkillEnum.Sailing]: skill(84, 2_900_000),
    [SkillEnum.Farming]: skill(98, 12_000_000),
    [SkillEnum.Slayer]: skill(99, 20_000_000),
    [SkillEnum.Attack]: skill(99, 15_000_000),
    [SkillEnum.Hunter]: null,
  });
  const weekAgo = entry(7, {
    [SkillEnum.Sailing]: skill(84, 2_900_000 - 7 * 16_000),
    [SkillEnum.Farming]: skill(98, 12_000_000 - 7 * 50_000),
    [SkillEnum.Slayer]: skill(99, 20_000_000 - 7 * 100_000),
    [SkillEnum.Attack]: skill(99, 15_000_000),
    [SkillEnum.Hunter]: null,
  });
  const history = [now, entry(1, {}), entry(2, {}), entry(3, {}), entry(4, {}), entry(5, {}), entry(6, {}), weekAgo];

  it('projects the next level from the pace, and 98 → 99 is a next level', () => {
    const { days, targets } = milestones(now, history, 7);

    expect(days).toBe(7);
    expect(targets.next.map(row => [row.skill, row.goal, row.daysLeft])).toEqual([
      [SkillEnum.Farming, 99, Math.ceil((XP_99 - 12_000_000) / 50_000)],
      // Sailing 85 is at 3,258,594 XP
      [SkillEnum.Sailing, 85, Math.ceil((calculateXPForSkillLevel(85) - 2_900_000) / 16_000)],
    ]);
    expect(targets.next[1].pace).toBe(16_000);
  });

  it('lists 99 for skills under it, and 200M for every skill with XP, soonest first', () => {
    const { targets } = milestones(now, history, 7);

    expect(targets['99'].map(row => row.skill)).toEqual([SkillEnum.Farming, SkillEnum.Sailing]);
    expect(targets['200m'].map(row => [row.skill, row.daysLeft])).toEqual([
      [SkillEnum.Slayer, 1800],
      [SkillEnum.Farming, 3760],
      [SkillEnum.Sailing, 12_319],
    ]);
  });

  it('flags milestones more than ten years away', () => {
    const { targets } = milestones(now, history, 7);

    expect(targets['200m'].map(row => row.far)).toEqual([false, true, true]);
    expect(targets['99'].map(row => row.far)).toEqual([false, false]);
  });

  it('leaves out a skill at its target', () => {
    const maxed = entry(0, { [SkillEnum.Slayer]: skill(99, 200_000_000) });
    const before = entry(7, { [SkillEnum.Slayer]: skill(99, 199_000_000) });

    const { targets } = milestones(maxed, [maxed, before], 7);

    expect(targets).toEqual({ 'next': [], '99': [], '200m': [] });
  });

  // A player tracked for fewer days than the period: the pace is over the days there are, not the period's
  it('averages over the days the history covers when it is shorter than the period', () => {
    const { days, targets } = milestones(now, history, 30);

    expect(days).toBe(7);
    expect(targets.next[1].pace).toBe(16_000);
  });

  it('has nothing to project from a single entry', () => {
    expect(milestones(now, [now], 7).targets).toEqual({ 'next': [], '99': [], '200m': [] });
  });
});
