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

/**
 * Per skill that gained XP, the XP gained so far on each day, largest total first. Takes the newest diff first; by
 * default every skill in the diffs but Overall.
 */
export function xpGainedSeries(diffs: Gains[], skills: readonly string[] = skillsIn(diffs)): ChartSeries[] {
  const days = [...diffs].reverse();

  return skills
    .map(name => {
      let total = 0;
      const points = days.map(diff => pointOf(diff, (total += Math.max(0, diff.skills[name]?.xp ?? 0))));
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
      const points = days.map(diff => pointOf(diff, Math.max(0, diff.activities[name]?.score ?? 0)));
      return { name, total: points.reduce((total, point) => total + point.y, 0), points };
    })
    .filter(series => series.total > 0)
    .sort((a, b) => b.total - a.total);
}

/** The skills in any of the diffs but Overall, in the order they first appear */
function skillsIn(diffs: Gains[]): string[] {
  const names = new Set(diffs.flatMap(diff => Object.keys(diff.skills)));
  names.delete(SkillEnum.Overall);
  return [...names];
}

function pointOf(diff: Gains, y: number): LogPoint {
  if (diff.days === 1) return { x: diff.date.getTime(), y };
  return { x: addDays(diff.date, diff.days - 1).getTime(), y, from: diff.date.getTime() };
}
