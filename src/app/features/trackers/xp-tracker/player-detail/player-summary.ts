import { hiscoreDiff, SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreEntry } from '@osrs-tracker/models';
import { BOSSES } from '../activity-categories';

export interface LevelGain {
  skill: string;
  from: number;
  to: number;
}

/** What a player gained over the last `days` days, for the stat tiles. */
export interface PeriodSummary {
  xp: number;
  /** XP gained in the `days` before that, `undefined` when the history doesn't go back that far */
  previousXp?: number;
  levels: LevelGain[];
  bossKills: number;
  mostKilled?: { name: string; kills: number };
}

/**
 * Sums the gains since the check `days` days ago. Takes the current stats (the live hiscores, or the newest stored entry
 * when they're unavailable) and the stored daily entries, newest first; `undefined` without an entry to compare with.
 */
export function periodSummary(current: HiscoreEntry, history: HiscoreEntry[], days: number): PeriodSummary | undefined {
  // the current stats can be the newest entry itself
  const entries = history[0] === current ? history : [current, ...history];
  if (entries.length < 2) return undefined;

  const baseline = history[Math.min(days, history.length - 1)];
  const diff = hiscoreDiff(current, baseline);

  const levels = diff.skills
    .filter(skill => skill.name !== SkillEnum.Overall && skill.level > 0)
    .map(skill => {
      const to = current.skills.find(({ name }) => name === skill.name)!.level;
      return { skill: skill.name, from: to - skill.level, to };
    });

  const bosses = diff.activities.filter(activity => BOSSES.has(activity.name) && activity.score > 0);
  const mostKilled = bosses.reduce<HiscoreEntry['activities'][number] | undefined>(
    (most, boss) => (!most || boss.score > most.score ? boss : most),
    undefined,
  );

  const previousXp = history.length > days * 2 ? overallXp(hiscoreDiff(history[days], history[days * 2])) : undefined;

  return {
    xp: overallXp(diff),
    previousXp,
    levels,
    bossKills: bosses.reduce((total, boss) => total + boss.score, 0),
    mostKilled: mostKilled && { name: mostKilled.name, kills: mostKilled.score },
  };
}

function overallXp(entry: HiscoreEntry): number {
  return Math.max(0, entry.skills.find(skill => skill.name === SkillEnum.Overall)?.xp ?? 0);
}
