import { HiscoreEntry } from '@osrs-tracker/models';
import {
  BossEnum,
  BountyHunterEnum,
  ClueScrollsEnum,
  CompetitiveEnum,
  MiniGameEnum,
  RaidEnum,
  SkillEnum,
} from './hiscore.enum';

export type Skill = {
  name: SkillEnum;
  rank: number;
  level: number;
  xp: number;
};

export type MiniGame = {
  name: Omit<HiscoreLineType, SkillEnum>;
  rank: number;
  score: number;
};

export type Hiscore = HiscoreEntry & {
  skills: { [key in SkillEnum]: Skill };
  bountyHunter: { [key in BountyHunterEnum]: MiniGame };
  clueScrolls: { [key in ClueScrollsEnum]: MiniGame };
  competitive: { [key in CompetitiveEnum]: MiniGame };
  miniGames: { [key in MiniGameEnum]: MiniGame };
  bosses: { [key in BossEnum]: MiniGame };
  raids: { [key in RaidEnum]: MiniGame };
};

export type HiscoreLineType =
  | SkillEnum
  | BountyHunterEnum
  | ClueScrollsEnum
  | CompetitiveEnum
  | MiniGameEnum
  | BossEnum
  | RaidEnum;
