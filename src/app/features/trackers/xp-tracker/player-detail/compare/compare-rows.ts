import { ActivityEnum, SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreEntry, skillProgress } from '@osrs-tracker/models';

/** One skill or activity on the newer day, and what changed since the older one when there is one */
export interface CompareRow {
  name: string;
  /** The level (skills) or score (activities) on the older day; only when comparing */
  from?: number;
  /** The level or score on the newer day */
  to: number;
  /** XP on the newer day; skills only */
  xp?: number;
  /** XP (skills) or score (activities) gained since the older day; only when comparing */
  gained?: number;
  /** The rank on the newer day; `null` when unranked */
  rank: number | null;
  /** Places climbed since the older day (negative when it fell); only when comparing and ranked on both days */
  rankChange?: number;
}

/** Every skill, Overall first, on `to`, compared with `from` when given */
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

/** The activities with a score on either day, in the hiscores' order, on `to`, compared with `from` when given */
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
