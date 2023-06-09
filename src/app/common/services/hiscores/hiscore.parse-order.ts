import {
  BossEnum,
  BountyHunterEnum,
  ClueScrollsEnum,
  CompetitiveEnum,
  MiniGameEnum,
  RaidEnum,
  SkillEnum,
} from './hiscore.enum';
import { HiscoreLineType } from './hiscore.model';

export type ParseOrder = HiscoreLineType[];

/** Parse Order as of 2023-03-15 */
export const PO_DEFAULT: ParseOrder = [
  SkillEnum.Overall,
  SkillEnum.Attack,
  SkillEnum.Defence,
  SkillEnum.Strength,
  SkillEnum.Hitpoints,
  SkillEnum.Ranged,
  SkillEnum.Prayer,
  SkillEnum.Magic,
  SkillEnum.Cooking,
  SkillEnum.Woodcutting,
  SkillEnum.Fletching,
  SkillEnum.Fishing,
  SkillEnum.Firemaking,
  SkillEnum.Crafting,
  SkillEnum.Smithing,
  SkillEnum.Mining,
  SkillEnum.Herblore,
  SkillEnum.Agility,
  SkillEnum.Thieving,
  SkillEnum.Slayer,
  SkillEnum.Farming,
  SkillEnum.Runecraft,
  SkillEnum.Hunter,
  SkillEnum.Construction,

  CompetitiveEnum.LeaguePoints,

  BountyHunterEnum.BountyHunter,
  BountyHunterEnum.BountyHunterRogues,

  ClueScrollsEnum.ClueScrollsAll,
  ClueScrollsEnum.ClueScrollsBeginner,
  ClueScrollsEnum.ClueScrollsEasy,
  ClueScrollsEnum.ClueScrollsMedium,
  ClueScrollsEnum.ClueScrollsHard,
  ClueScrollsEnum.ClueScrollsElite,
  ClueScrollsEnum.ClueScrollsMaster,

  CompetitiveEnum.LastManStanding,
  CompetitiveEnum.PvpArena,

  MiniGameEnum.SoulWarsZeal,
  MiniGameEnum.RiftsClosed,

  BossEnum.AbyssalSire,
  BossEnum.AlchemicalHydra,
  BossEnum.BarrowsChests,
  BossEnum.Bryophyta,
  BossEnum.Callisto,
  BossEnum.Cerberus,

  RaidEnum.ChambersOfXeric,
  RaidEnum.ChambersOfXericChallengeMode,

  BossEnum.ChaosElemental,
  BossEnum.ChaosFanatic,
  BossEnum.CommanderZilyana,
  BossEnum.CorporealBeast,
  BossEnum.CrazyArchaeologist,
  BossEnum.DagannothPrime,
  BossEnum.DagannothRex,
  BossEnum.DagannothSupreme,
  BossEnum.DerangedArchaeologist,
  BossEnum.GeneralGraardor,
  BossEnum.GiantMole,
  BossEnum.GrotesqueGuardians,
  BossEnum.Hespori,
  BossEnum.KalphiteQueen,
  BossEnum.KingBlackDragon,
  BossEnum.Kraken,
  BossEnum.KreeArra,
  BossEnum.KrilTsutsaroth,
  BossEnum.Mimic,
  BossEnum.Nex,
  BossEnum.Nightmare,
  BossEnum.PhosanisNightmare,
  BossEnum.Obor,
  BossEnum.PhantomMuspah,
  BossEnum.Sarachnis,
  BossEnum.Scorpia,
  BossEnum.Skotizo,
  BossEnum.Tempoross,

  RaidEnum.TheGauntlet,
  RaidEnum.TheCorruptedGauntlet,
  RaidEnum.TheatreOfBlood,
  RaidEnum.TheatreOfBloodHardMode,

  BossEnum.ThermoNuclearSmokeDevil,

  RaidEnum.TombsOfAmascut,
  RaidEnum.TombsOfAmascutExpertMode,

  BossEnum.TzKalZuk,
  BossEnum.TzTokJad,
  BossEnum.Venenatis,
  BossEnum.Vetion,
  BossEnum.Vorkath,
  BossEnum.Wintertodt,
  BossEnum.Zalcano,
  BossEnum.Zulrah,
];

/** Parse Order as of 2023-04-13 (3 new bosses, Artio, ...) */
export const PO_2023_04_13: ParseOrder = [
  SkillEnum.Overall,
  SkillEnum.Attack,
  SkillEnum.Defence,
  SkillEnum.Strength,
  SkillEnum.Hitpoints,
  SkillEnum.Ranged,
  SkillEnum.Prayer,
  SkillEnum.Magic,
  SkillEnum.Cooking,
  SkillEnum.Woodcutting,
  SkillEnum.Fletching,
  SkillEnum.Fishing,
  SkillEnum.Firemaking,
  SkillEnum.Crafting,
  SkillEnum.Smithing,
  SkillEnum.Mining,
  SkillEnum.Herblore,
  SkillEnum.Agility,
  SkillEnum.Thieving,
  SkillEnum.Slayer,
  SkillEnum.Farming,
  SkillEnum.Runecraft,
  SkillEnum.Hunter,
  SkillEnum.Construction,

  CompetitiveEnum.LeaguePoints,

  BountyHunterEnum.BountyHunter,
  BountyHunterEnum.BountyHunterRogues,

  ClueScrollsEnum.ClueScrollsAll,
  ClueScrollsEnum.ClueScrollsBeginner,
  ClueScrollsEnum.ClueScrollsEasy,
  ClueScrollsEnum.ClueScrollsMedium,
  ClueScrollsEnum.ClueScrollsHard,
  ClueScrollsEnum.ClueScrollsElite,
  ClueScrollsEnum.ClueScrollsMaster,

  CompetitiveEnum.LastManStanding,
  CompetitiveEnum.PvpArena,

  MiniGameEnum.SoulWarsZeal,
  MiniGameEnum.RiftsClosed,

  BossEnum.AbyssalSire,
  BossEnum.AlchemicalHydra,
  BossEnum.Artio,
  BossEnum.BarrowsChests,
  BossEnum.Bryophyta,
  BossEnum.Callisto,
  BossEnum.Calvarion,
  BossEnum.Cerberus,

  RaidEnum.ChambersOfXeric,
  RaidEnum.ChambersOfXericChallengeMode,

  BossEnum.ChaosElemental,
  BossEnum.ChaosFanatic,
  BossEnum.CommanderZilyana,
  BossEnum.CorporealBeast,
  BossEnum.CrazyArchaeologist,
  BossEnum.DagannothPrime,
  BossEnum.DagannothRex,
  BossEnum.DagannothSupreme,
  BossEnum.DerangedArchaeologist,
  BossEnum.GeneralGraardor,
  BossEnum.GiantMole,
  BossEnum.GrotesqueGuardians,
  BossEnum.Hespori,
  BossEnum.KalphiteQueen,
  BossEnum.KingBlackDragon,
  BossEnum.Kraken,
  BossEnum.KreeArra,
  BossEnum.KrilTsutsaroth,
  BossEnum.Mimic,
  BossEnum.Nex,
  BossEnum.Nightmare,
  BossEnum.PhosanisNightmare,
  BossEnum.Obor,
  BossEnum.PhantomMuspah,
  BossEnum.Sarachnis,
  BossEnum.Scorpia,
  BossEnum.Skotizo,
  BossEnum.Spindel,
  BossEnum.Tempoross,

  RaidEnum.TheGauntlet,
  RaidEnum.TheCorruptedGauntlet,
  RaidEnum.TheatreOfBlood,
  RaidEnum.TheatreOfBloodHardMode,

  BossEnum.ThermoNuclearSmokeDevil,

  RaidEnum.TombsOfAmascut,
  RaidEnum.TombsOfAmascutExpertMode,

  BossEnum.TzKalZuk,
  BossEnum.TzTokJad,
  BossEnum.Venenatis,
  BossEnum.Vetion,
  BossEnum.Vorkath,
  BossEnum.Wintertodt,
  BossEnum.Zalcano,
  BossEnum.Zulrah,
];

/** Parse Order as of 2023-05-24 (legacy bounty hunter) */
export const PO_2023_05_25: ParseOrder = [
  SkillEnum.Overall,
  SkillEnum.Attack,
  SkillEnum.Defence,
  SkillEnum.Strength,
  SkillEnum.Hitpoints,
  SkillEnum.Ranged,
  SkillEnum.Prayer,
  SkillEnum.Magic,
  SkillEnum.Cooking,
  SkillEnum.Woodcutting,
  SkillEnum.Fletching,
  SkillEnum.Fishing,
  SkillEnum.Firemaking,
  SkillEnum.Crafting,
  SkillEnum.Smithing,
  SkillEnum.Mining,
  SkillEnum.Herblore,
  SkillEnum.Agility,
  SkillEnum.Thieving,
  SkillEnum.Slayer,
  SkillEnum.Farming,
  SkillEnum.Runecraft,
  SkillEnum.Hunter,
  SkillEnum.Construction,

  CompetitiveEnum.LeaguePoints,

  BountyHunterEnum.BountyHunter,
  BountyHunterEnum.BountyHunterRogues,
  BountyHunterEnum.BountyHunterLegacy,
  BountyHunterEnum.BountyHunterLegacyRogues,

  ClueScrollsEnum.ClueScrollsAll,
  ClueScrollsEnum.ClueScrollsBeginner,
  ClueScrollsEnum.ClueScrollsEasy,
  ClueScrollsEnum.ClueScrollsMedium,
  ClueScrollsEnum.ClueScrollsHard,
  ClueScrollsEnum.ClueScrollsElite,
  ClueScrollsEnum.ClueScrollsMaster,

  CompetitiveEnum.LastManStanding,
  CompetitiveEnum.PvpArena,

  MiniGameEnum.SoulWarsZeal,
  MiniGameEnum.RiftsClosed,

  BossEnum.AbyssalSire,
  BossEnum.AlchemicalHydra,
  BossEnum.Artio,
  BossEnum.BarrowsChests,
  BossEnum.Bryophyta,
  BossEnum.Callisto,
  BossEnum.Calvarion,
  BossEnum.Cerberus,

  RaidEnum.ChambersOfXeric,
  RaidEnum.ChambersOfXericChallengeMode,

  BossEnum.ChaosElemental,
  BossEnum.ChaosFanatic,
  BossEnum.CommanderZilyana,
  BossEnum.CorporealBeast,
  BossEnum.CrazyArchaeologist,
  BossEnum.DagannothPrime,
  BossEnum.DagannothRex,
  BossEnum.DagannothSupreme,
  BossEnum.DerangedArchaeologist,
  BossEnum.GeneralGraardor,
  BossEnum.GiantMole,
  BossEnum.GrotesqueGuardians,
  BossEnum.Hespori,
  BossEnum.KalphiteQueen,
  BossEnum.KingBlackDragon,
  BossEnum.Kraken,
  BossEnum.KreeArra,
  BossEnum.KrilTsutsaroth,
  BossEnum.Mimic,
  BossEnum.Nex,
  BossEnum.Nightmare,
  BossEnum.PhosanisNightmare,
  BossEnum.Obor,
  BossEnum.PhantomMuspah,
  BossEnum.Sarachnis,
  BossEnum.Scorpia,
  BossEnum.Skotizo,
  BossEnum.Spindel,
  BossEnum.Tempoross,

  RaidEnum.TheGauntlet,
  RaidEnum.TheCorruptedGauntlet,
  RaidEnum.TheatreOfBlood,
  RaidEnum.TheatreOfBloodHardMode,

  BossEnum.ThermoNuclearSmokeDevil,

  RaidEnum.TombsOfAmascut,
  RaidEnum.TombsOfAmascutExpertMode,

  BossEnum.TzKalZuk,
  BossEnum.TzTokJad,
  BossEnum.Venenatis,
  BossEnum.Vetion,
  BossEnum.Vorkath,
  BossEnum.Wintertodt,
  BossEnum.Zalcano,
  BossEnum.Zulrah,
];

/** Newest to olders for easy use */
export const ParseOrderMap: { [date: string]: ParseOrder } = {
  '2023-05-25': PO_2023_05_25,
  '2023-04-13': PO_2023_04_13,
  '2023-03-15': PO_DEFAULT,
};
