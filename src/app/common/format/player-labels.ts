import { type Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';

// Framework-free: the server's link preview cards (`src/server/og/player-card.ts`) use these too, so the card and the
// page describe a player alike.

export function capitalise(text: string): string {
  return text.replace(/(^|\s)\S/g, start => start.toUpperCase());
}

export function accountType({ type, status, diedAsHardcore }: Player): string {
  if (type === PlayerType.Normal) return 'Regular account';
  if (status === PlayerStatus.DeIroned) return 'Former ironman';
  if (status === PlayerStatus.DeUltimated) return 'Ironman, formerly ultimate';
  if (diedAsHardcore) return 'Ironman, formerly hardcore';
  return {
    [PlayerType.Ironman]: 'Ironman',
    [PlayerType.Hardcore]: 'Hardcore ironman',
    [PlayerType.Ultimate]: 'Ultimate ironman',
  }[type];
}
