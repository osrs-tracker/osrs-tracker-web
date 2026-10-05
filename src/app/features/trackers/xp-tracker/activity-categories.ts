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
