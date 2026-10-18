import { ActivityEnum, HiscoreDiffActivity, HiscoreDiffSkill, SkillEnum } from '@osrs-tracker/models';
import { addDays } from 'date-fns';
import { Gains } from './player-summary';

/**
 * A day with gains (or the days a gap in the history covers, `to` its last), or a run of consecutive days in which
 * nothing happened.
 */
export type LogGroup =
  | {
      type: 'day';
      date: Date;
      to?: Date;
      /** Today's gains so far: the hour they count from */
      since?: string;
      overall?: HiscoreDiffSkill;
      skills: (HiscoreDiffSkill & { name: string })[];
      activities: (HiscoreDiffActivity & { name: string })[];
    }
  | { type: 'empty'; from: Date; to: Date; days: number };

/**
 * The day log's cards, newest first: each day's skills and activities that gained (not Overall, which the card shows
 * on its own), with each run of consecutive empty days (including a single day) merged into one group.
 *
 * @param diffs the daily diffs, newest first
 * @param todayLoading the live hiscores are loading: the first diff (today's) is left out, as it's a skeleton until then
 * @param todaySince the hour today's gains count from (the first diff)
 */
export function dayLogGroups(diffs: Gains[], todayLoading: boolean, todaySince: string | undefined): LogGroup[] {
  const groups: LogGroup[] = [];
  let run: Extract<LogGroup, { type: 'empty' }> | undefined;

  const flushRun = (): void => {
    if (run) groups.push(run);
    run = undefined;
  };

  (todayLoading ? diffs.slice(1) : diffs).forEach((diff, i) => {
    const skills = Object.entries(diff.skills)
      .map(([name, skill]) => ({ name, ...skill }))
      .filter(skill => skill.xp > 0 && skill.name !== SkillEnum.Overall);
    // the total of all clue tiers would count them twice
    const activities = Object.entries(diff.activities)
      .map(([name, activity]) => ({ name, ...activity }))
      .filter(activity => activity.score > 0 && activity.name !== ActivityEnum.ClueScrollsAll);

    const to = diff.days > 1 ? addDays(diff.date, diff.days - 1) : undefined;

    if (!skills.length && !activities.length) {
      // newest first, so each diff extends the run back
      run = { type: 'empty', from: diff.date, to: run?.to ?? to ?? diff.date, days: (run?.days ?? 0) + diff.days };
    } else {
      flushRun();
      const overall = diff.skills[SkillEnum.Overall];
      // not on gains across a gap, which reach back before today
      const since = i === 0 && !to && !todayLoading ? todaySince : undefined;
      groups.push({ type: 'day', date: diff.date, to, since, overall, skills, activities });
    }
  });
  flushRun();

  return groups;
}
