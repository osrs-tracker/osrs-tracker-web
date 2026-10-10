import { Player } from '@osrs-tracker/models';

/**
 * Whether the player has a history for `scrapingOffset`: tracked there, or paused (still has the history). An untracked
 * player, such as a preview of one that isn't stored, has neither.
 */
export function isTrackedFor(player: Player, scrapingOffset: number): boolean {
  return !!(player.scrapingOffsets?.includes(scrapingOffset) || player.pausedScrapingOffsets?.includes(scrapingOffset));
}
