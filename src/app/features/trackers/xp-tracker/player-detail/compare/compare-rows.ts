import { ActivityEnum, HiscoreEntry, SkillEnum, skillProgress } from '@osrs-tracker/models';

/** One skill or activity on the newer day, and what changed since the older one when there is one */
export interface CompareRow {
  name: string;
  from?: number;
  to: number;
  xp?: number;
  gained?: number;
  rank: number | null;
  /** Negative when it fell; only when ranked on both days */
  rankChange?: number;
}

export function skillRows(to: HiscoreEntry, from?: HiscoreEntry): CompareRow[] {
  return Object.values(SkillEnum).map(name => {
    const now = to.skills[name];
    const { level, xp } = skillProgress(now);
    const row: CompareRow = { name, to: level, xp, rank: now?.rank ?? null };
    if (!from) return row;

    const then = from.skills[name];
    const before = skillProgress(then);
    return {
      ...row,
      from: before.level,
      gained: xp - before.xp,
      rankChange: rankChange(then?.rank, now?.rank),
    };
  });
}

export function activityRows(to: HiscoreEntry, from?: HiscoreEntry): CompareRow[] {
  return Object.values(ActivityEnum)
    .filter(name => to.activities[name] || from?.activities[name])
    .map(name => {
      const now = to.activities[name];
      const score = now?.score ?? 0;
      const row: CompareRow = { name, to: score, rank: now?.rank ?? null };
      if (!from) return row;

      const then = from.activities[name];
      const before = then?.score ?? 0;
      return { ...row, from: before, gained: score - before, rankChange: rankChange(then?.rank, now?.rank) };
    });
}

/** A lower rank is better, so climbing from 1,200 to 1,000 is +200 */
function rankChange(before: number | null | undefined, after: number | null | undefined): number | undefined {
  return before != null && after != null ? before - after : undefined;
}
