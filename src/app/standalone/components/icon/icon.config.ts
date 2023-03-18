import { PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { SkillEnum } from 'src/app/services/hiscores/hiscore.enum';

export const iconMap: { [key: string]: string } = {
  [PlayerType.Ironman]: '/assets/icons/player_type/ironman.png',
  [PlayerType.Ultimate]: '/assets/icons/player_type/ultimate.png',
  [PlayerType.Hardcore]: '/assets/icons/player_type/hardcore_ironman.png',

  ['dead']: '/assets/icons/skull.png',
  [PlayerStatus.DeIroned]: '/assets/icons/player_type/de_ironman.png',
  [PlayerStatus.DeUltimated]: '/assets/icons/player_type/de_ultimate.png',

  [SkillEnum.Overall]: '/assets/icons/skills/skill_icon_overall1.gif',
  [SkillEnum.Attack]: '/assets/icons/skills/skill_icon_attack1.gif',
  [SkillEnum.Defence]: '/assets/icons/skills/skill_icon_defence1.gif',
  [SkillEnum.Strength]: '/assets/icons/skills/skill_icon_strength1.gif',
  [SkillEnum.Hitpoints]: '/assets/icons/skills/skill_icon_hitpoints1.gif',
  [SkillEnum.Ranged]: '/assets/icons/skills/skill_icon_ranged1.gif',
  [SkillEnum.Prayer]: '/assets/icons/skills/skill_icon_prayer1.gif',
  [SkillEnum.Magic]: '/assets/icons/skills/skill_icon_magic1.gif',
  [SkillEnum.Cooking]: '/assets/icons/skills/skill_icon_cooking1.gif',
  [SkillEnum.Woodcutting]: '/assets/icons/skills/skill_icon_woodcutting1.gif',
  [SkillEnum.Fletching]: '/assets/icons/skills/skill_icon_fletching1.gif',
  [SkillEnum.Fishing]: '/assets/icons/skills/skill_icon_fishing1.gif',
  [SkillEnum.Firemaking]: '/assets/icons/skills/skill_icon_firemaking1.gif',
  [SkillEnum.Crafting]: '/assets/icons/skills/skill_icon_crafting1.gif',
  [SkillEnum.Smithing]: '/assets/icons/skills/skill_icon_smithing1.gif',
  [SkillEnum.Mining]: '/assets/icons/skills/skill_icon_mining1.gif',
  [SkillEnum.Herblore]: '/assets/icons/skills/skill_icon_herblore1.gif',
  [SkillEnum.Agility]: '/assets/icons/skills/skill_icon_agility1.gif',
  [SkillEnum.Thieving]: '/assets/icons/skills/skill_icon_thieving1.gif',
  [SkillEnum.Slayer]: '/assets/icons/skills/skill_icon_slayer1.gif',
  [SkillEnum.Farming]: '/assets/icons/skills/skill_icon_farming1.gif',
  [SkillEnum.Runecraft]: '/assets/icons/skills/skill_icon_runecraft1.gif',
  [SkillEnum.Hunter]: '/assets/icons/skills/skill_icon_hunter1.gif',
  [SkillEnum.Construction]: '/assets/icons/skills/skill_icon_construction1.gif',
};
