import { ActivityEnum, SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreEntry } from '@osrs-tracker/models';
import { describe, expect, it } from 'vitest';
import { periodSummary } from './player-summary';

/** An entry with `xp` overall XP, a Sailing level and boss kill counts (-1 is unranked) */
const entry = (xp: number, sailing = 80, kills: Record<string, number> = {}): HiscoreEntry =>
  ({
    date: new Date(),
    skills: [
      { name: SkillEnum.Overall, xp, level: 2000, rank: 1 },
      { name: SkillEnum.Sailing, xp: 0, level: sailing, rank: 1 },
    ],
    activities: Object.entries(kills).map(([name, score]) => ({ name, score, rank: 1 })),
  }) as HiscoreEntry;

describe('periodSummary', () => {
  // Newest first: 100 XP a day for the last two days, 50 a day before that
  const history = [entry(500), entry(400), entry(300), entry(250), entry(200)];

  it('sums the gains since the entry `days` back and compares them with the days before', () => {
    expect(periodSummary(history[0], history, 2)).toMatchObject({ xp: 200, previousXp: 100 });
  });

  it("adds today's live gains to the same period", () => {
    expect(periodSummary(entry(530), history, 2)).toMatchObject({ xp: 230, previousXp: 100 });
  });

  it('leaves out the comparison when the history is shorter than two periods', () => {
    expect(periodSummary(history[0], history.slice(0, 4), 2)?.previousXp).toBeUndefined();
    // and sums what there is when it's shorter than one
    expect(periodSummary(history[0], history.slice(0, 2), 7)?.xp).toBe(100);
  });

  it('lists the levels gained and the most killed boss, counting an unranked boss as 0 kills', () => {
    const current = entry(0, 84, {
      [ActivityEnum.Zulrah]: 60,
      [ActivityEnum.Vorkath]: 8,
      [ActivityEnum.SoulWarsZeal]: 900,
    });
    const old = entry(0, 82, { [ActivityEnum.Zulrah]: 7, [ActivityEnum.Vorkath]: -1, [ActivityEnum.SoulWarsZeal]: 0 });

    expect(periodSummary(current, [old], 7)).toMatchObject({
      levels: [{ skill: SkillEnum.Sailing, from: 82, to: 84 }],
      bossKills: 61,
      mostKilled: { name: ActivityEnum.Zulrah, kills: 53 },
    });
  });

  it('has nothing to sum without a second entry', () => {
    const only = entry(500);
    expect(periodSummary(only, [only], 7)).toBeUndefined();
  });
});
