import { PlayerType } from '@osrs-tracker/models';

export const iconMap: Record<string, string> = {
  ['coins']: '/coins.png',
  ['coin stack']: '/coin_stack.png',
  ['combat']: '/combat.gif',
  ['dead']: '/skull.png',

  [PlayerType.Ironman]: '/player_type/ironman.png',
  [PlayerType.Ultimate]: '/player_type/ultimate.png',
  [PlayerType.Hardcore]: '/player_type/hardcore_ironman.png',
};
