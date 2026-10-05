import { SkillEnum } from '@osrs-tracker/hiscores';

export type ChartSkill = Exclude<SkillEnum, SkillEnum.Overall>;

/**
 * RuneLite's skill colours (`net.runelite.client.ui.SkillColor`), the closest thing to an official mapping. Only the
 * lightness is adjusted where needed, so lines have at least 3:1 contrast on light cards and 3.5:1 on dark cards.
 */
export const SKILL_COLORS: Record<ChartSkill, { light: string; dark: string }> = {
  [SkillEnum.Attack]: { light: '#9b2007', dark: '#ee310b' },
  [SkillEnum.Defence]: { light: '#6a7fc4', dark: '#9aa9de' },
  [SkillEnum.Strength]: { light: '#04955a', dark: '#04955a' },
  [SkillEnum.Hitpoints]: { light: '#837e7e', dark: '#aaa5a5' },
  [SkillEnum.Ranged]: { light: '#6d9017', dark: '#6d9017' },
  [SkillEnum.Prayer]: { light: '#908520', dark: '#9f9323' },
  [SkillEnum.Magic]: { light: '#2c46b0', dark: '#5e77d5' },
  [SkillEnum.Cooking]: { light: '#702386', dark: '#b552d2' },
  [SkillEnum.Woodcutting]: { light: '#348c25', dark: '#358e26' },
  [SkillEnum.Fletching]: { light: '#038d7d', dark: '#038d7d' },
  [SkillEnum.Fishing]: { light: '#6a84a4', dark: '#6a84a4' },
  [SkillEnum.Firemaking]: { light: '#b87518', dark: '#bd7819' },
  [SkillEnum.Crafting]: { light: '#976e4d', dark: '#9f7451' },
  [SkillEnum.Smithing]: { light: '#6c6b52', dark: '#7f7e60' },
  [SkillEnum.Mining]: { light: '#598ba4', dark: '#5d8fa7' },
  [SkillEnum.Herblore]: { light: '#078509', dark: '#08910a' },
  [SkillEnum.Agility]: { light: '#3a3c89', dark: '#7476c4' },
  [SkillEnum.Thieving]: { light: '#6c3457', dark: '#b36295' },
  [SkillEnum.Slayer]: { light: '#4a4a4a', dark: '#767676' },
  [SkillEnum.Farming]: { light: '#60913c', dark: '#65983f' },
  [SkillEnum.Runecraft]: { light: '#9d8218', dark: '#aa8d1a' },
  [SkillEnum.Hunter]: { light: '#5c5941', dark: '#837f5c' },
  [SkillEnum.Construction]: { light: '#82745f', dark: '#897b64' },
  [SkillEnum.Sailing]: { light: '#0a948d', dark: '#0ba59d' },
};
