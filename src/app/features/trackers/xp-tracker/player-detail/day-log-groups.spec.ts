import { ActivityEnum, SkillEnum } from '@osrs-tracker/hiscores';
import { describe, expect, it } from 'vitest';
import { dayLogGroups } from './day-log-groups';
import { Gains } from './player-summary';

const day = (date: number): Date => new Date(Date.UTC(2026, 9, date));

/** The diff dated October `date`: the XP each skill and the score each activity gained, Overall their total */
const diff = (
  date: number,
  gains: { skills?: Record<string, number>; activities?: Record<string, number> } = {},
  days = 1,
): Gains => {
  const skills = gains.skills ?? {};
  const overall = Object.values(skills).reduce((sum, xp) => sum + xp, 0);
  return {
    date: day(date),
    scrapingOffset: 0,
    days,
    skills: Object.fromEntries(
      Object.entries({ [SkillEnum.Overall]: overall, ...skills }).map(([name, xp]) => [
        name,
        { rank: 0, level: 0, xp },
      ]),
    ),
    activities: Object.fromEntries(
      Object.entries(gains.activities ?? {}).map(([name, score]) => [name, { rank: 0, score }]),
    ),
  };
};

const active = (date: number, days = 1): Gains => diff(date, { skills: { [SkillEnum.Attack]: 1_000 } }, days);

/** Each group as `day 12` or `empty 9–11 (3)`, to compare the shape at a glance */
const shape = (groups: ReturnType<typeof dayLogGroups>): string[] =>
  groups.map(group =>
    group.type === 'day'
      ? `day ${group.date.getUTCDate()}${group.to ? `–${group.to.getUTCDate()}` : ''}`
      : `empty ${group.from.getUTCDate()}–${group.to.getUTCDate()} (${group.days})`,
  );

describe('dayLogGroups', () => {
  it('merges a run of empty days into one group, from its oldest day to its newest', () => {
    const groups = dayLogGroups([active(12), diff(11), diff(10), diff(9), active(8)], false, undefined);
    expect(shape(groups)).toEqual(['day 12', 'empty 9–11 (3)', 'day 8']);
  });

  it('keeps a single empty day as a group of its own, also as the oldest', () => {
    const groups = dayLogGroups([active(12), diff(11), active(10), diff(9)], false, undefined);
    expect(shape(groups)).toEqual(['day 12', 'empty 11–11 (1)', 'day 10', 'empty 9–9 (1)']);
  });

  it('dates gains across a gap in the history to its last day, and counts an empty gap in its run', () => {
    // 8–10 are one diff, then 4–6
    const groups = dayLogGroups([active(12), diff(11), diff(8, {}, 3), active(4, 3)], false, undefined);
    expect(shape(groups)).toEqual(['day 12', 'empty 8–11 (4)', 'day 4–6']);
  });

  it('leaves out Overall, which the card shows on its own, and the all-clues total', () => {
    const [group] = dayLogGroups(
      [
        diff(12, {
          skills: { [SkillEnum.Attack]: 1_000, [SkillEnum.Slayer]: 0 },
          activities: { [ActivityEnum.ClueScrollsAll]: 2, [ActivityEnum.ClueScrollsHard]: 2, [ActivityEnum.Zulrah]: 0 },
        }),
      ],
      false,
      undefined,
    );
    expect(group).toMatchObject({
      type: 'day',
      overall: { xp: 1_000 },
      skills: [{ name: SkillEnum.Attack, xp: 1_000 }],
      activities: [{ name: ActivityEnum.ClueScrollsHard, score: 2 }],
    });
  });

  it("dates only today's gains from the hour they count from, and leaves them out while they load", () => {
    const since = (groups: ReturnType<typeof dayLogGroups>): (string | undefined)[] =>
      groups.map(group => (group.type === 'day' ? group.since : undefined));

    expect(since(dayLogGroups([active(12), active(11)], false, '02:00'))).toEqual(['02:00', undefined]);
    // not across a gap, which reaches back before today
    expect(since(dayLogGroups([active(10, 3), active(9)], false, '02:00'))).toEqual([undefined, undefined]);
    expect(shape(dayLogGroups([active(12), active(11)], true, '02:00'))).toEqual(['day 11']);
    expect(since(dayLogGroups([active(12), active(11)], true, '02:00'))).toEqual([undefined]);
  });
});
