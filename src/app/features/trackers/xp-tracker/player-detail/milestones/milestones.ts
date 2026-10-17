import { calculateXPForSkillLevel, hiscoreDiff, SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreEntry, MAX_SKILL_LEVEL } from '@osrs-tracker/models';
import { periodStart } from '../player-summary';

export type MilestoneTarget = 'next' | '99' | '200m';

const XP_99 = calculateXPForSkillLevel(MAX_SKILL_LEVEL);
const MAX_XP = 200_000_000;
/** Further off than ten years, a date means nothing: the card says "10+ years" */
const FAR_DAYS = 3652;

export interface Milestone {
  skill: string;
  target: MilestoneTarget;
  /** The level now; for 200M, the XP now matters instead */
  level: number;
  /** The level reached, or 200M */
  goal: number | '200M';
  xp: number;
  /** Average XP a day over the days the history covers */
  pace: number;
  /** From the last check, rounded up */
  daysLeft: number;
  /** More than ten years away */
  far: boolean;
}

export interface Milestones {
  /** The days the pace is averaged over: the period, or fewer when the history doesn't go back that far */
  days: number;
  /** Each target's milestones, soonest first */
  targets: Record<MilestoneTarget, Milestone[]>;
}

/**
 * When each skill reaches its next level, 99 and 200M XP at its average XP a day since the check `days` days back
 * (or the oldest one), carried forward. Takes the current stats and the stored entries, newest first. Skills without XP
 * in those days, unranked ones and Overall get none; a skill at a target gets none for it. A skill at 98's next level is
 * 99, so it's in both.
 */
export function milestones(current: HiscoreEntry, history: HiscoreEntry[], days: number): Milestones {
  const targets: Record<MilestoneTarget, Milestone[]> = { 'next': [], '99': [], '200m': [] };
  const start = history.length ? periodStart(current, history, days) : undefined;
  if (!start?.days) return { days, targets };

  const gains = hiscoreDiff(current, history[start.index]).skills;
  for (const [skill, now] of Object.entries(current.skills)) {
    const gain = gains[skill]?.xp ?? 0;
    if (skill === SkillEnum.Overall || !now || gain <= 0) continue;

    const pace = gain / start.days;
    const add = (target: MilestoneTarget, goal: Milestone['goal'], goalXp: number): void => {
      if (now.xp >= goalXp) return;
      const daysLeft = Math.ceil((goalXp - now.xp) / pace);
      targets[target].push({
        skill,
        target,
        level: now.level,
        goal,
        xp: now.xp,
        pace,
        daysLeft,
        far: daysLeft > FAR_DAYS,
      });
    };
    if (now.level < MAX_SKILL_LEVEL) {
      add('next', now.level + 1, calculateXPForSkillLevel(now.level + 1));
      add('99', MAX_SKILL_LEVEL, XP_99);
    }
    add('200m', '200M', MAX_XP);
  }

  for (const list of Object.values(targets)) {
    list.sort((a, b) => a.daysLeft - b.daysLeft || a.skill.localeCompare(b.skill));
  }
  return { days: start.days, targets };
}
