import { HiscoreEntry } from '@osrs-tracker/models';

export enum SkillEnum {
  Overall = 'Overall',
  Attack = 'Attack',
  Defence = 'Defence',
  Strength = 'Strength',
  Hitpoints = 'Hitpoints',
  Ranged = 'Ranged',
  Prayer = 'Prayer',
  Magic = 'Magic',
  Cooking = 'Cooking',
  Woodcutting = 'Woodcutting',
  Fletching = 'Fletching',
  Fishing = 'Fishing',
  Firemaking = 'Firemaking',
  Crafting = 'Crafting',
  Smithing = 'Smithing',
  Mining = 'Mining',
  Herblore = 'Herblore',
  Agility = 'Agility',
  Thieving = 'Thieving',
  Slayer = 'Slayer',
  Farming = 'Farming',
  Runecraft = 'Runecraft',
  Hunter = 'Hunter',
  Construction = 'Construction',
}

export type Skill = {
  name: SkillEnum;
  rank: number;
  level: number;
  xp: number;
};

export enum MiniGameEnum {
  LeaguePoints = 'League Points',

  BountyHunter = 'Bounty Hunter - Hunter',
  BountyHunterRogues = 'Bounty Hunter - Rogues',

  ClueScrollsAll = 'Clue Scrolls (all)',
  ClueScrollsBeginner = 'Clue Scrolls (beginner)',
  ClueScrollsEasy = 'Clue Scrolls (easy)',
  ClueScrollsMedium = 'Clue Scrolls (medium)',
  ClueScrollsHard = 'Clue Scrolls (hard)',
  ClueScrollsElite = 'Clue Scrolls (elite)',
  ClueScrollsMaster = 'Clue Scrolls (master)',

  PvpArena = 'PvP Arena - Rank',
  LastManStanding = 'Last Man Standing (Rank)',

  SoulWarsZeal = 'Soul Wars Zeal',
  RiftsClosed = 'Rifts Closed',
}

export enum RaidEnum {
  ChambersOfXeric = 'Chambers of Xeric',
  ChambersOfXericChallengeMode = 'Chambers of Xeric: Challenge Mode',
  TheGauntlet = 'TheGauntlet',
  TheCorruptedGauntlet = 'The Corrupted Gauntlet',
  TheathreOfBlood = 'Theatre of Blood',
  TheathreOfBloodHardMode = 'Theatre of Blood: Hard Mode',
  TombsOfAmascut = 'Tombs of Amascut',
  TombsOfAmascutExpertMode = 'Tombs of Amascut: Expert Mode',
}

export enum BossEnum {
  AbyssalSire = 'Abyssal Sire',
  AlchemicalHydra = 'Alchemical Hydra',
  BarrowsChests = 'Barrows Chests',
  Bryophyta = 'Bryophyta',
  Callisto = 'Callisto',
  Cerberus = 'Cerberus',
  ChaosElemental = 'Chaos Elemental',
  ChaosFanatic = 'Chaos Fanatic',
  CommanderZilyana = 'Commander Zilyana',
  CorporealBeast = 'Corporeal Beast',
  CrazyArchaeologist = 'Crazy Archaeologist',
  DagannothPrime = 'Dagannoth Prime',
  DagannothRex = 'Dagannoth Rex',
  DagannothSupreme = 'Dagannoth Supreme',
  DerangedArchaeologist = 'Deranged Archaeologist',
  GeneralGraardor = 'General Graardor',
  GiantMole = 'Giant Mole',
  GrotesqueGuardians = 'Grotesque Guardians',
  Hespori = 'Hespori',
  KalphiteQueen = 'Kalphite Queen',
  KingBlackDragon = 'King Black Dragon',
  Kraken = 'Kraken',
  KreeAra = "Kree'Arra",
  KrilTsutsaroth = "K'ril Tsutsaroth",
  Mimic = 'Mimic',
  Nex = 'Nex',
  Nightmare = 'Nightmare',
  PhosanisNightmare = "Phosani's Nightmare",
  Obor = 'Obor',
  PhantomMuspah = 'Phantom Muspah',
  Sarachnis = 'Sarachnis',
  Scorpia = 'Scorpia',
  Skotizo = 'Skotizo',
  Tempoross = 'Tempoross',
  ThermoNuclearSmokeDevil = 'Thermonuclear Smoke Devil',
  TzKalZuk = 'TzKal-Zuk',
  TzTokJad = 'TzTok-Jad',
  Venenatis = 'Venenatis',
  Vetion = "Vet'ion",
  Vorkath = 'Vorkath',
  Wintertodt = 'Wintertodt',
  Zalcano = 'Zalcano',
  Zulrah = 'Zulrah',
}

export type MiniGame = {
  name: MiniGameEnum | RaidEnum | BossEnum;
  rank: number;
  score: number;
};

export type Hiscore = HiscoreEntry & {
  [key: string]: Skill[] | MiniGame | MiniGame[];
  skills: Skill[];
  leaguePoints: MiniGame;
  bountyHunter: MiniGame[];
  clueScrolls: MiniGame[];
  miniGames: MiniGame[];
  bosses: MiniGame[];
  raids: MiniGame[];
};

export type ParseOrder = (BossEnum | MiniGameEnum | RaidEnum | SkillEnum)[];

export const PO_2023_03_15: ParseOrder = [
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

  MiniGameEnum.LeaguePoints,

  MiniGameEnum.BountyHunter,
  MiniGameEnum.BountyHunterRogues,

  MiniGameEnum.ClueScrollsAll,
  MiniGameEnum.ClueScrollsBeginner,
  MiniGameEnum.ClueScrollsEasy,
  MiniGameEnum.ClueScrollsMedium,
  MiniGameEnum.ClueScrollsHard,
  MiniGameEnum.ClueScrollsElite,
  MiniGameEnum.ClueScrollsMaster,

  MiniGameEnum.PvpArena,
  MiniGameEnum.LastManStanding,
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
  BossEnum.KreeAra,
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
  RaidEnum.TheathreOfBlood,
  RaidEnum.TheathreOfBloodHardMode,

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
