import { PlayerCount } from '@osrs-tracker/models';

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
