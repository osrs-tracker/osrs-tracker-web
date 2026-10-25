import { ActivityEnum } from '@osrs-tracker/models';

const ACTIVITIES = Object.values(ActivityEnum);

export const RAIDS: ReadonlySet<string> = new Set([
  ActivityEnum.ChambersOfXeric,
  ActivityEnum.ChambersOfXericChallengeMode,
  ActivityEnum.TheatreOfBlood,
  ActivityEnum.TheatreOfBloodHardMode,
  ActivityEnum.TombsOfAmascut,
  ActivityEnum.TombsOfAmascutExpertMode,
  ActivityEnum.TheFracturedArchive,
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

export const MINIGAMES: ReadonlySet<string> = new Set(
  ACTIVITIES.slice(0, ACTIVITIES.indexOf(ActivityEnum.ChambersOfXeric)).filter(
    activity =>
      !CLUES.has(activity) && activity !== ActivityEnum.ClueScrollsAll && activity !== ActivityEnum.CollectionsLogged,
  ),
);

/** The Fractured Archive has no harder mode on the hiscores, so it gets a row of its own. */
export const RAID_LAYOUT: (string | null)[] = fillRows([
  ActivityEnum.ChambersOfXeric,
  ActivityEnum.TheatreOfBlood,
  ActivityEnum.TombsOfAmascut,
  ActivityEnum.ChambersOfXericChallengeMode,
  ActivityEnum.TheatreOfBloodHardMode,
  ActivityEnum.TombsOfAmascutExpertMode,
  ActivityEnum.TheFracturedArchive,
]);

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

export function fillRows(names: string[]): (string | null)[] {
  return [...names, ...Array<null>((3 - (names.length % 3)) % 3).fill(null)];
}

export const BOSS_LAYOUT: (string | null)[] = fillRows(Object.values(ActivityEnum).filter(name => BOSSES.has(name)));
export const CLUE_LAYOUT: (string | null)[] = Object.values(ActivityEnum).filter(name => CLUES.has(name));
