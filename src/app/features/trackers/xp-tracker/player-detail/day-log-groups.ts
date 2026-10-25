import { ActivityEnum, HiscoreDiffActivity, HiscoreDiffSkill, SkillEnum } from '@osrs-tracker/models';
import { addDays } from 'date-fns';
import { Gains } from './player-summary';

export type LogGroup =
  | {
      type: 'day';
      date: Date;
      to?: Date;
      since?: string;
      overall?: HiscoreDiffSkill;
      skills: (HiscoreDiffSkill & { name: string })[];
      activities: (HiscoreDiffActivity & { name: string })[];
    }
  | { type: 'empty'; from: Date; to: Date; days: number }
  | { type: 'today'; date: Date; since: string };

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

    if (!skills.length && !activities.length && i === 0 && !to && !todayLoading && todaySince) {
      groups.push({ type: 'today', date: diff.date, since: todaySince });
    } else if (!skills.length && !activities.length) {
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
