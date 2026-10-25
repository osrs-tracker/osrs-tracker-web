import { SkillEnum } from '@osrs-tracker/models';

// Framework-free: the server's player card (`src/server/og/player-card.ts`) uses it too

export type GridSkill = Exclude<SkillEnum, SkillEnum.Overall>;

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
