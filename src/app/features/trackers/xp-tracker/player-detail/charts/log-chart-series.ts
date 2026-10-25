import { SkillEnum } from '@osrs-tracker/models';
import { addDays, format } from 'date-fns';
import { ChartTableRow } from '@app/common/charts/chart-table';
import { formatWhole } from '@app/common/format/number-format';
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
  /** Oldest first */
  points: LogPoint[];
}

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

export function logTableRows(series: ChartSeries[], cumulative = false): ChartTableRow[] {
  return (series[0]?.points ?? [])
    .map(({ x, from }, i) => ({
      key: x,
      cells: [
        from === undefined ? format(x, 'EEE d MMM') : `${format(from, 'd MMM')} – ${format(x, 'd MMM')}`,
        ...series.map(({ points }) => formatWhole(points[i].y - (cumulative ? (points[i - 1]?.y ?? 0) : 0))),
      ],
    }))
    .reverse();
}

function skillsIn(diffs: Gains[]): string[] {
  const names = new Set(diffs.flatMap(diff => Object.keys(diff.skills)));
  names.delete(SkillEnum.Overall);
  return [...names];
}

function pointOf(diff: Gains, y: number): LogPoint {
  if (diff.days === 1) return { x: diff.date.getTime(), y };
  return { x: addDays(diff.date, diff.days - 1).getTime(), y, from: diff.date.getTime() };
}
