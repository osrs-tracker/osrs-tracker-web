import { SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreEntry } from '@osrs-tracker/models';
import { Point } from 'chart.js';
import { ChartSkill } from '../../skill-colors';

export interface ChartSeries<TName extends string = string> {
  name: TName;
  total: number;
  /** One point per day, oldest first */
  points: Point[];
}

/** Per skill that gained XP, the XP gained so far on each day, largest total first. Takes the newest diff first. */
export function xpGainedSeries(diffs: HiscoreEntry[]): ChartSeries<ChartSkill>[] {
  const days = [...diffs].reverse();
  const skills = Object.values(SkillEnum).filter((skill): skill is ChartSkill => skill !== SkillEnum.Overall);

  return skills
    .map(name => {
      let total = 0;
      const points = days.map(diff => ({
        x: diff.date.getTime(),
        y: (total += Math.max(0, diff.skills.find(skill => skill.name === name)?.xp ?? 0)),
      }));
      return { name, total, points };
    })
    .filter(series => series.total > 0)
    .sort((a, b) => b.total - a.total);
}

/** Per activity of the category with a score, the score of each day, largest total first. Takes the newest diff first. */
export function activitySeries(diffs: HiscoreEntry[], category: ReadonlySet<string>): ChartSeries[] {
  const days = [...diffs].reverse();

  return [...category]
    .map(name => {
      const points = days.map(diff => ({
        x: diff.date.getTime(),
        y: Math.max(0, diff.activities.find(activity => activity.name === name)?.score ?? 0),
      }));
      return { name, total: points.reduce((total, point) => total + point.y, 0), points };
    })
    .filter(series => series.total > 0)
    .sort((a, b) => b.total - a.total);
}
