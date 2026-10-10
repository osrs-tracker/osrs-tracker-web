import { ActivityEnum } from '@osrs-tracker/hiscores';

const ACTIVITIES = Object.values(ActivityEnum);

export const RAIDS: ReadonlySet<string> = new Set([
  ActivityEnum.ChambersOfXeric,
  ActivityEnum.ChambersOfXericChallengeMode,
  ActivityEnum.TheatreOfBlood,
  ActivityEnum.TheatreOfBloodHardMode,
  ActivityEnum.TombsOfAmascut,
  ActivityEnum.TombsOfAmascutExpertMode,
]);

// Every activity from Chambers of Xeric onwards is a boss (bosses and boss-like minigames such as Wintertodt),
// except the raids, which have their own card.
export const BOSSES: ReadonlySet<string> = new Set(
  ACTIVITIES.slice(ACTIVITIES.indexOf(ActivityEnum.ChambersOfXeric)).filter(activity => !RAIDS.has(activity)),
);

// The total of all tiers is left out, so clues aren't counted twice
export const CLUES: ReadonlySet<string> = new Set([
  ActivityEnum.ClueScrollsBeginner,
  ActivityEnum.ClueScrollsEasy,
  ActivityEnum.ClueScrollsMedium,
  ActivityEnum.ClueScrollsHard,
  ActivityEnum.ClueScrollsElite,
  ActivityEnum.ClueScrollsMaster,
]);

/** Minigames, points and ranks: everything before the raids that isn't a clue scroll or the collection log. */
export const MINIGAMES: ReadonlySet<string> = new Set(
  ACTIVITIES.slice(0, ACTIVITIES.indexOf(ActivityEnum.ChambersOfXeric)).filter(
    activity =>
      !CLUES.has(activity) && activity !== ActivityEnum.ClueScrollsAll && activity !== ActivityEnum.CollectionsLogged,
  ),
);

/** Normal modes on the first row, their harder modes below */
export const RAID_LAYOUT: ActivityEnum[] = [
  ActivityEnum.ChambersOfXeric,
  ActivityEnum.TheatreOfBlood,
  ActivityEnum.TombsOfAmascut,
  ActivityEnum.ChambersOfXericChallengeMode,
  ActivityEnum.TheatreOfBloodHardMode,
  ActivityEnum.TombsOfAmascutExpertMode,
];

/**
 * The minigames card in rows of three: minigames; Bounty Hunter (Legacy under current) with the PvP ratings; seasonal
 * points. Each row only shows what the player is ranked in.
 */
export const MINIGAME_ROWS: ActivityEnum[][] = [
  [ActivityEnum.RiftsClosed, ActivityEnum.SoulWarsZeal, ActivityEnum.ColosseumGlory],
  [ActivityEnum.BountyHunter, ActivityEnum.BountyHunterRogue, ActivityEnum.LastManStanding],
  [ActivityEnum.BountyHunterLegacy, ActivityEnum.BountyHunterLegacyRogue, ActivityEnum.PvpArena],
  [ActivityEnum.LeaguePoints, ActivityEnum.DeadmanPoints, ActivityEnum.GridPoints],
];

/**
 * Why a minigame isn't charted: only running totals are, as a daily gain of a rating, a best score or seasonal points
 * means nothing. Missing means it's charted.
 */
export const UNCHARTED_MINIGAMES: Partial<Record<ActivityEnum, string>> = {
  [ActivityEnum.ColosseumGlory]: 'A best score, not a running total',
  [ActivityEnum.LastManStanding]: 'A rating, it goes up and down',
  [ActivityEnum.PvpArena]: 'A rating, it goes up and down',
  [ActivityEnum.BountyHunterLegacy]: "Legacy scores can't be earned any more",
  [ActivityEnum.BountyHunterLegacyRogue]: "Legacy scores can't be earned any more",
  [ActivityEnum.LeaguePoints]: 'Seasonal points',
  [ActivityEnum.DeadmanPoints]: 'Seasonal points',
  [ActivityEnum.GridPoints]: 'Seasonal points',
};
