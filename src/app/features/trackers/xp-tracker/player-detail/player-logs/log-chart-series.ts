import { SkillEnum } from '@osrs-tracker/hiscores';
import { addDays } from 'date-fns';
import { Gains } from '../player-summary';

/** A day's point; gains across a gap in the history go on its last day, with `from` its first */
export interface LogPoint {
  x: number;
  y: number;
  from?: number;
}

export interface ChartSeries<TName extends string = string> {
  name: TName;
  total: number;
  /** One point per day with data, oldest first */
  points: LogPoint[];
}

const SKILLS: string[] = Object.values(SkillEnum).filter(skill => skill !== SkillEnum.Overall);

/**
 * Per skill that gained XP, the XP gained so far on each day, largest total first. Takes the newest diff first; all
 * skills but Overall by default.
 */
export function xpGainedSeries(diffs: Gains[], skills: readonly string[] = SKILLS): ChartSeries[] {
  const days = [...diffs].reverse();

  return skills
    .map(name => {
      let total = 0;
      const points = days.map(diff =>
        pointOf(diff, (total += Math.max(0, diff.skills.find(skill => skill.name === name)?.xp ?? 0))),
      );
      return { name, total, points };
    })
    .filter(series => series.total > 0)
    .sort((a, b) => b.total - a.total);
}

/** Per activity of the category with a score, the score of each day, largest total first. Takes the newest diff first. */
export function activitySeries(diffs: Gains[], category: ReadonlySet<string>): ChartSeries[] {
  const days = [...diffs].reverse();

  return [...category]
    .map(name => {
      const points = days.map(diff =>
        pointOf(diff, Math.max(0, diff.activities.find(activity => activity.name === name)?.score ?? 0)),
      );
      return { name, total: points.reduce((total, point) => total + point.y, 0), points };
    })
    .filter(series => series.total > 0)
    .sort((a, b) => b.total - a.total);
}

function pointOf(diff: Gains, y: number): LogPoint {
  if (diff.days === 1) return { x: diff.date.getTime(), y };
  return { x: addDays(diff.date, diff.days - 1).getTime(), y, from: diff.date.getTime() };
}
