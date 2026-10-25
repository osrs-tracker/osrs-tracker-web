import { SkillEnum } from '@osrs-tracker/models';

// Framework-free, like `player-labels.ts`: the player link preview card (`src/server/og/player-card.ts`) lays its
// skills out from this too, so the card and the page's skill grid stay in the game's order.

/** A skill with a cell of its own in the stats tab: all but Overall, the total level */
export type GridSkill = Exclude<SkillEnum, SkillEnum.Overall>;

/** The in-game stats tab, read row by row, three to a row (and to a line here: prettier-ignore) */
// prettier-ignore
export const SKILL_LAYOUT: readonly GridSkill[] = [
  SkillEnum.Attack, SkillEnum.Hitpoints, SkillEnum.Mining,
  SkillEnum.Strength, SkillEnum.Agility, SkillEnum.Smithing,
  SkillEnum.Defence, SkillEnum.Herblore, SkillEnum.Fishing,
  SkillEnum.Ranged, SkillEnum.Thieving, SkillEnum.Cooking,
  SkillEnum.Prayer, SkillEnum.Crafting, SkillEnum.Firemaking,
  SkillEnum.Magic, SkillEnum.Fletching, SkillEnum.Woodcutting,
  SkillEnum.Runecraft, SkillEnum.Slayer, SkillEnum.Farming,
  SkillEnum.Construction, SkillEnum.Hunter, SkillEnum.Sailing,
];
