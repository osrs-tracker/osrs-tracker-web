import { ActivityEnum } from '@osrs-tracker/models';
import { describe, expect, it } from 'vitest';
import { BOSS_LAYOUT, BOSSES, RAID_LAYOUT, RAIDS } from './activity-categories';

describe('activity categories', () => {
  it('lays out every raid once on the raids card, in rows of three', () => {
    const raids = RAID_LAYOUT.filter(name => name !== null);
    expect(raids).toHaveLength(RAIDS.size);
    expect(new Set(raids)).toEqual(RAIDS);
    expect(RAID_LAYOUT.length % 3).toBe(0);
  });

  it('keeps the raids off the bosses card', () => {
    expect([...RAIDS].filter(raid => BOSSES.has(raid) || BOSS_LAYOUT.includes(raid))).toEqual([]);
  });

  it('counts The Fractured Archive as a raid', () => {
    expect(RAIDS.has(ActivityEnum.TheFracturedArchive)).toBe(true);
  });
});
