import { PlayerStatus, PlayerType } from '@osrs-tracker/models';

export const iconMap: Record<string, string> = {
  ['coins']: '/coins.png',
  ['combat']: '/combat.png',
  ['dead']: '/skull.png',

  [PlayerType.Ironman]: '/player_type/ironman.png',
  [PlayerType.Ultimate]: '/player_type/ultimate.png',
  [PlayerType.Hardcore]: '/player_type/hardcore_ironman.png',

  [PlayerStatus.DeIroned]: '/player_type/de_ironman.png',
  [PlayerStatus.DeUltimated]: '/player_type/de_ultimate.png',
};
