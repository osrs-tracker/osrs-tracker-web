/**
 * The world list's raw location codes (`byLocation` keys), named and flagged as World Select shows them. 0 holds the US
 * east and west worlds together. 8, 9, 10 and 12 were matched by their worlds' numbers on 2026-10-13: Brazil (692–695),
 * Japan (698–700), Singapore (660–664), South Africa (667–668). A code missing here is counted under "Other locations".
 */
const WORLD_LOCATIONS: Record<string, { name: string; flag: string }> = {
  '0': { name: 'United States', flag: 'us' },
  '1': { name: 'United Kingdom', flag: 'gb' },
  '3': { name: 'Australia', flag: 'au' },
  '7': { name: 'Germany', flag: 'de' },
  '8': { name: 'Brazil', flag: 'br' },
  '9': { name: 'Japan', flag: 'jp' },
  '10': { name: 'Singapore', flag: 'sg' },
  '12': { name: 'South Africa', flag: 'za' },
};

/** The key of the codes missing from `WORLD_LOCATIONS`, summed */
const OTHER_LOCATIONS = 'other';

export interface LocationCount {
  /** A raw location code, or `OTHER_LOCATIONS` */
  key: string;
  name: string;
  /** The World Select flag (30×15), none for other locations */
  flag?: string;
  players: number;
}

/** Players per location, largest first, with the unknown codes last as one "Other locations" (when there are any) */
export function locationCounts(byLocation: Record<string, number>): LocationCount[] {
  let other = 0;
  const known: LocationCount[] = [];
  for (const [code, players] of Object.entries(byLocation)) {
    const location = WORLD_LOCATIONS[code];
    if (location) known.push({ key: code, name: location.name, flag: flagUrl(location.flag), players });
    else other += players;
  }

  known.sort((a, b) => b.players - a.players);
  return other ? [...known, { key: OTHER_LOCATIONS, name: 'Other locations', players: other }] : known;
}

/** `byLocation` in the given order of keys (the hero card's), with any key missing from it last */
export function locationCountsInOrder(byLocation: Record<string, number>, order: readonly string[]): LocationCount[] {
  const counts = locationCounts(byLocation);
  const rank = (key: string) => (order.includes(key) ? order.indexOf(key) : order.length);
  return counts.sort((a, b) => rank(a.key) - rank(b.key));
}

/** A share of `total` as a whole percentage, or "<1%" for a sliver */
export function formatShare(part: number, total: number): string {
  const share = total ? (part / total) * 100 : 0;
  return share > 0 && share < 1 ? '<1%' : `${Math.round(share)}%`;
}

function flagUrl(flag: string): string {
  return `/assets/icons/flags/${flag}.png`;
}
