import { PlayerStatus, PlayerType } from '@osrs-tracker/models';

export const iconMap: Record<string, string> = {
  ['coins']: '/coins.png',
  ['coin stack']: '/coin_stack.png',
  ['combat']: '/combat.gif',
  ['dead']: '/skull.png',

  [PlayerType.Ironman]: '/player_type/ironman.png',
  [PlayerType.Ultimate]: '/player_type/ultimate.png',
  [PlayerType.Hardcore]: '/player_type/hardcore_ironman.png',

  [PlayerStatus.DeIroned]: '/player_type/de_ironman.png',
  [PlayerStatus.DeUltimated]: '/player_type/de_ultimate.png',
  // a de-ironed hardcore ironman keeps the hardcore helm
  [`${PlayerStatus.DeIroned}_${PlayerType.Hardcore}`]: '/player_type/de_hardcore_ironman.png',
};
