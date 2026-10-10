import { ActivityEnum, fromJagex, JagexHiscoreJson, SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreEntry } from '@osrs-tracker/models';
import { describe, expect, it } from 'vitest';
import { THE_FRAKING, TOXSICK } from './testing/jagex-hiscores';
import { dailyGains, periodSummary } from './player-summary';

const HOUR = 60 * 60 * 1000;
/** The last daily check was an hour ago */
const checked = (daysAgo: number): Date => new Date(Date.now() - HOUR - daysAgo * 24 * HOUR);

/** An entry checked `daysAgo`, with `xp` overall XP, a Sailing level and boss kill counts (`null` is unranked) */
const entry = (xp: number, daysAgo = 0, sailing = 80, kills: Record<string, number | null> = {}): HiscoreEntry => ({
  date: checked(daysAgo),
  scrapingOffset: 0,
  skills: {
    [SkillEnum.Overall]: { xp, level: 2000, rank: 1 },
    [SkillEnum.Sailing]: { xp: 0, level: sailing, rank: 1 },
  },
  activities: Object.fromEntries(
    Object.entries(kills).map(([name, score]) => [name, score === null ? null : { score, rank: 1 }]),
  ),
});

/** A real hiscores response as a stored entry, checked `daysAgo` */
const jagexEntry = (json: JagexHiscoreJson, daysAgo: number): HiscoreEntry => {
  const { skills, activities } = fromJagex(json);
  return { date: checked(daysAgo), scrapingOffset: 0, skills, activities };
};

describe('periodSummary', () => {
  // Newest first: 100 XP a day for the last two days, 50 a day before that
  const history = [entry(500, 0), entry(400, 1), entry(300, 2), entry(250, 3), entry(200, 4)];
  // the live hiscores, checked now
  const live = (xp: number): HiscoreEntry => ({ ...entry(xp), date: new Date() });

  it('sums the gains since the entry `days` back and compares them with the days before', () => {
    expect(periodSummary(history[0], history, 2)).toMatchObject({ xp: 200, previousXp: 100, since: undefined });
  });

  it("adds today's live gains to the same period", () => {
    expect(periodSummary(live(530), history, 2)).toMatchObject({ xp: 230, previousXp: 100, since: undefined });
  });

  it('leaves out the comparison when the history is shorter than two periods', () => {
    expect(periodSummary(history[0], history.slice(0, 4), 2)?.previousXp).toBeUndefined();
    // and sums what there is since the oldest entry when it's shorter than one
    expect(periodSummary(history[0], history.slice(0, 2), 7)).toMatchObject({ xp: 100, since: history[1].date });
  });

  describe('with a gap in the history', () => {
    // nothing stored 2 to 5 days ago: the player was off the hiscores
    const gapped = [entry(500, 0), entry(400, 1), entry(100, 6), entry(50, 7), entry(0, 8)];

    it('counts days, not entries, and leaves out a comparison of unequal periods', () => {
      // the newest entry at least 2 days back is 6 days back
      expect(periodSummary(gapped[0], gapped, 2)).toMatchObject({
        xp: 400,
        previousXp: undefined,
        since: gapped[2].date,
      });
      expect(periodSummary(gapped[0], gapped, 7)).toMatchObject({ xp: 450, since: undefined });
      // the previous period would start in the gap
      expect(periodSummary(gapped[0], gapped, 1)).toMatchObject({ xp: 100, previousXp: undefined, since: undefined });
    });

    it('dates the gains across it by its first day and spans all its days', () => {
      expect(dailyGains(live(530), gapped).map(({ date, days }) => [date, days])).toEqual([
        [gapped[0].date, 1],
        [gapped[1].date, 1],
        [gapped[2].date, 5],
        [gapped[3].date, 1],
        [gapped[4].date, 1],
      ]);
    });

    it('counts the days since a stale newest entry towards the live gains', () => {
      const stale = gapped.slice(2);
      expect(dailyGains(live(530), stale)[0].days).toBe(7);
      expect(periodSummary(live(530), stale, 7)).toMatchObject({ xp: 480, since: undefined });
      expect(periodSummary(live(530), stale, 2)).toMatchObject({ xp: 430, since: stale[0].date });
    });
  });

  it('lists the levels gained and the most killed boss, counting an unranked boss as 0 kills', () => {
    const current = entry(0, 0, 84, {
      [ActivityEnum.Zulrah]: 60,
      [ActivityEnum.Vorkath]: 8,
      [ActivityEnum.SoulWarsZeal]: 900,
    });
    const old = entry(0, 7, 82, {
      [ActivityEnum.Zulrah]: 7,
      [ActivityEnum.Vorkath]: null,
      [ActivityEnum.SoulWarsZeal]: 0,
    });

    expect(periodSummary(current, [old], 7)).toMatchObject({
      levels: [{ skill: SkillEnum.Sailing, from: 82, to: 84 }],
      bossKills: 61,
      mostKilled: { name: ActivityEnum.Zulrah, kills: 53 },
    });
  });

  describe('with real hiscores', () => {
    it('counts a newly trained skill from level 1 and an activity Jagex added later from 0', () => {
      const old = jagexEntry(TOXSICK, 7);
      // Jagex didn't list Doom of Mokhaiotl yet a week ago
      delete old.activities[ActivityEnum.DoomOfMokhaiotl];
      const current = jagexEntry(TOXSICK, 0);
      current.skills[SkillEnum.Overall] = { ...current.skills[SkillEnum.Overall]!, xp: 99_860_556 + 388 };
      current.skills[SkillEnum.Sailing] = { rank: null, level: 5, xp: 388 };
      current.activities[ActivityEnum.DoomOfMokhaiotl] = { rank: null, score: 3 };
      current.activities[ActivityEnum.Zulrah] = { rank: 349_000, score: 224 + 2 };

      expect(old.skills[SkillEnum.Sailing]).toBeNull();
      expect(periodSummary(current, [old], 7)).toEqual({
        xp: 388,
        previousXp: undefined,
        since: undefined,
        levels: [{ skill: SkillEnum.Sailing, from: 1, to: 5 }],
        bossKills: 5,
        mostKilled: { name: ActivityEnum.DoomOfMokhaiotl, kills: 3 },
      });
    });

    it('sums the gains of an active account', () => {
      const history = [jagexEntry(THE_FRAKING, 0), jagexEntry(THE_FRAKING, 1)];
      const today = history[0];
      today.skills[SkillEnum.Overall] = { ...today.skills[SkillEnum.Overall]!, xp: 334_599_439 + 20_000 };
      today.skills[SkillEnum.Prayer] = { rank: 269_000, level: 94, xp: 7_381_941 + 20_000 };
      today.activities[ActivityEnum.Vorkath] = { rank: 205_000, score: 500 + 4 };

      expect(periodSummary(today, history, 1)).toMatchObject({
        xp: 20_000,
        levels: [{ skill: SkillEnum.Prayer, from: 93, to: 94 }],
        bossKills: 4,
        mostKilled: { name: ActivityEnum.Vorkath, kills: 4 },
      });
      expect(dailyGains(today, history)[1].skills[SkillEnum.Prayer]).toEqual({ rank: -424, level: 1, xp: 20_000 });
    });
  });

  it('has nothing to sum without a second entry', () => {
    const only = entry(500);
    expect(periodSummary(only, [only], 7)).toBeUndefined();
  });
});
