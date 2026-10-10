import { HiscoreActivity, HiscoreEntry, HiscoreSkill, SkillName } from '@osrs-tracker/models';

/** A skill with no XP: Jagex lists it at level 1, and entries store it as `null` or leave it out */
export const UNTRAINED: HiscoreSkill = { rank: null, level: 1, xp: 0 };

/** A skill's value in an entry or a diff; untrained skills read as level 1 with no XP */
export function skillOf(entry: HiscoreEntry, name: SkillName): HiscoreSkill {
  return entry.skills[name] ?? UNTRAINED;
}

/** An activity's value in an entry or a diff, `null` without a score (stored as `null`, or a key Jagex added later) */
export function activityOf(entry: HiscoreEntry, name: string): HiscoreActivity | null {
  return entry.activities[name] ?? null;
}

/** A skill or activity value with its name, for lists */
export type Named<T> = T & { name: string };

/** The values that are there, with their names, in the entry's order; leaves out `null` ones */
export function named<T extends object>(values: Partial<Record<string, T | null>>): Named<T>[] {
  return Object.entries(values).flatMap(([name, value]) => (value ? [{ name, ...value }] : []));
}
