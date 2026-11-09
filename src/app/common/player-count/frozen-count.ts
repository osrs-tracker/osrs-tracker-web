import { PlayerCount, PlayerCountPoint, PlayerCountRange } from '@osrs-tracker/models';

/** Shown wherever a count is flagged: the live label, the chart's tooltip, legend and table */
export const FROZEN_MESSAGE = 'Count not updating, possibly an outage';

type Counts = Pick<PlayerCount, 'total' | 'members' | 'f2p' | 'byLocation'>;

/**
 * Two counts taken apart that match on every number: Jagex's world list stopped updating, which happens during an
 * outage. Every number, not one: small regions repeat by chance all the time, a whole sample never does
 * (osrs-tracker/osrs-tracker-web#508).
 */
export function isFrozen(a: Counts, b: Counts): boolean {
  if (a.total !== b.total || a.members !== b.members || a.f2p !== b.f2p) return false;
  const locations = Object.keys(a.byLocation);
  return (
    locations.length === Object.keys(b.byLocation).length &&
    locations.every(location => a.byLocation[location] === b.byLocation[location])
  );
}

/**
 * Per point, whether it repeats the one before on every number. Only on 24h and 7D, whose points are every sample:
 * hourly and daily averages almost never repeat exactly.
 */
export function frozenPoints(range: PlayerCountRange, points: PlayerCountPoint[]): boolean[] {
  if (range !== '24h' && range !== '7d') return points.map(() => false);
  return points.map((point, i) => i > 0 && isFrozen(points[i - 1], point));
}
