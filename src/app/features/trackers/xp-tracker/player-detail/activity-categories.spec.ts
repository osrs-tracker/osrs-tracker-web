import { describe, expect, it } from 'vitest';
import { BOSS_LAYOUT, BOSSES, RAID_LAYOUT, RAIDS } from './activity-categories';

describe('activity categories', () => {
  it('lays out every raid once on the raids card', () => {
    const raids = RAID_LAYOUT.filter(name => name !== null);
    expect(raids).toHaveLength(RAIDS.size);
    expect(new Set(raids)).toEqual(RAIDS);
  });

  it('keeps the raids off the bosses card', () => {
    expect([...RAIDS].filter(raid => BOSSES.has(raid) || BOSS_LAYOUT.includes(raid))).toEqual([]);
  });
});
