import { hiscoreDiff, SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreDiff, HiscoreEntry } from '@osrs-tracker/models';
import { BOSSES } from '../activity-categories';
import { named, skillOf } from '../hiscore-values';

const DAY = 24 * 60 * 60 * 1000;

/** The gains between two checks (or the newest check and the live hiscores), dated by the older one */
export interface Gains extends HiscoreDiff {
  /** The days they cover: 1, or more across a gap in the history (the player was off the hiscores or not checked) */
  days: number;
}

export interface LevelGain {
  skill: string;
  from: number;
  to: number;
}

/** What a player gained over the last `days` days, for the stat tiles. */
export interface PeriodSummary {
  xp: number;
  /** XP gained in the `days` before that, `undefined` when the history doesn't cover them day for day */
  previousXp?: number;
  /** The check the gains count from, when it isn't `days` days back: the history is shorter, or has a gap there */
  since?: Date;
  levels: LevelGain[];
  bossKills: number;
  mostKilled?: { name: string; kills: number };
}

/**
 * Each check's gains, newest first. Takes the current stats (the live hiscores, or the newest stored entry when they're
 * unavailable) and the stored daily entries, newest first; the first gains are today's so far.
 */
export function dailyGains(current: HiscoreEntry, history: HiscoreEntry[]): Gains[] {
  const ages = checkAges(current, history);
  let newer = current;
  return history.map((entry, i) => {
    const gains = { ...hiscoreDiff(newer, entry), days: Math.max(1, ages[i] - (ages[i - 1] ?? -1)) };
    newer = entry;
    return gains;
  });
}

/**
 * Where a period of `days` days starts: the index in `history` of the newest entry at least that many days back (the
 * oldest when the history doesn't go back that far) and how many days back it is.
 */
export function periodStart(
  current: HiscoreEntry,
  history: HiscoreEntry[],
  days: number,
): { index: number; days: number } {
  const ages = checkAges(current, history);
  const found = ages.findIndex(age => age >= days);
  const index = found === -1 ? history.length - 1 : found;
  return { index, days: ages[index] };
}

/** Sums the gains since the check `days` days ago; `undefined` without an entry to compare with. */
export function periodSummary(current: HiscoreEntry, history: HiscoreEntry[], days: number): PeriodSummary | undefined {
  // the current stats can be the newest entry itself
  const entries = history[0] === current ? history : [current, ...history];
  if (entries.length < 2) return undefined;

  const start = periodStart(current, history, days);
  const baseline = history[start.index];
  const diff = hiscoreDiff(current, baseline);

  // diff values are never null, and cover the skills and activities of both entries
  const levels = named(diff.skills)
    .filter(skill => skill.name !== SkillEnum.Overall && skill.level > 0)
    .map(skill => {
      const to = skillOf(current, skill.name).level;
      return { skill: skill.name, from: to - skill.level, to };
    });

  const bosses = named(diff.activities).filter(activity => BOSSES.has(activity.name) && activity.score > 0);
  const mostKilled = bosses.reduce<(typeof bosses)[number] | undefined>(
    (most, boss) => (!most || boss.score > most.score ? boss : most),
    undefined,
  );

  // only periods of the same length compare
  const previous = start.days === days ? periodStart(current, history, days * 2) : undefined;
  const previousXp =
    previous?.days === days * 2 ? overallXp(hiscoreDiff(baseline, history[previous.index])) : undefined;

  return {
    xp: overallXp(diff),
    previousXp,
    since: start.days === days ? undefined : baseline.date,
    levels,
    bossKills: bosses.reduce((total, boss) => total + boss.score, 0),
    mostKilled: mostKilled && { name: mostKilled.name, kills: mostKilled.score },
  };
}

/**
 * How many days before the current stats each stored entry was checked. The checks are whole days apart, give or take
 * how long a check took; the live hiscores fall somewhere in the day after the newest check.
 */
function checkAges(current: HiscoreEntry, history: HiscoreEntry[]): number[] {
  const newest = history[0]?.date.getTime() ?? 0;
  const sinceNewest = current === history[0] ? 0 : Math.max(0, Math.floor((current.date.getTime() - newest) / DAY));
  return history.map(entry => sinceNewest + Math.round((newest - entry.date.getTime()) / DAY));
}

function overallXp(entry: HiscoreEntry): number {
  return Math.max(0, skillOf(entry, SkillEnum.Overall).xp);
}
