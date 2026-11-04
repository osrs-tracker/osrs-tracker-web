import { type Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';

// Framework-free: the server's link preview cards (`src/server/og/player-card.ts`) use these too, so the card and the
// page describe a player alike.

export function capitalise(text: string): string {
  return text.replace(/(^|\s)\S/g, start => start.toUpperCase());
}

export function accountType({ type, status, diedAsHardcore }: Player): string {
  if (type === PlayerType.Normal) {
    // with the flag: a Hardcore Worlds character that died and transferred to the main game (the API keeps it set)
    return diedAsHardcore ? 'Regular account, formerly Hardcore Worlds' : 'Regular account';
  }
  // before the ironman statuses: the API's hardcore death check doesn't apply to these characters
  if (type === PlayerType.HardcoreMain) return 'Hardcore main';
  if (status === PlayerStatus.DeIroned) return 'Former ironman';
  if (status === PlayerStatus.DeUltimated) return 'Ironman, formerly ultimate';
  if (diedAsHardcore) return 'Ironman, formerly hardcore';
  return {
    [PlayerType.Ironman]: 'Ironman',
    [PlayerType.Hardcore]: 'Hardcore ironman',
    [PlayerType.Ultimate]: 'Ultimate ironman',
  }[type];
}

/** A Hardcore Worlds character's stats and ranks come from that table, so its ranks are among those characters only */
export function rankLabel(type: PlayerType | undefined): string {
  return type === PlayerType.HardcoreMain ? 'Hardcore Worlds rank' : 'Rank';
}
