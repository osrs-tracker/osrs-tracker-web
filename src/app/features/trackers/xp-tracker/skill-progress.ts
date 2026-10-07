import { calculateXPForSkillLevel } from '@osrs-tracker/hiscores';

/** How far a skill is into its current level, 0–100. */
export function percentageToNextLevel(xp: number, level: number): number {
  const xpForCurrentLevel = calculateXPForSkillLevel(level);
  const xpForNextLevel = calculateXPForSkillLevel(level + 1);

  return Math.min(100, ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100);
}
