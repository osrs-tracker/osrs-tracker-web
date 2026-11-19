import { PlayerCountPoint } from '@osrs-tracker/models';
import { describe, expect, it } from 'vitest';
import { hardcoreData, hasHardcore } from './player-count-chart';

const point = (minute: number, hardcore?: number): PlayerCountPoint => ({
  date: new Date(Date.UTC(2026, 10, 19, 16, minute)),
  total: 90_000,
  members: 70_000,
  f2p: 20_000,
  byLocation: {},
  ...(hardcore === undefined ? {} : { hardcore }),
});

describe('the Hardcore Worlds band', () => {
  it('has a gap, not 0, for each point counted before Hardcore Worlds were', () => {
    expect(hardcoreData([point(35), point(45, 6_000), point(55, 0)])).toEqual([
      { x: Date.UTC(2026, 10, 19, 16, 35), y: null },
      { x: Date.UTC(2026, 10, 19, 16, 45), y: 6_000 },
      { x: Date.UTC(2026, 10, 19, 16, 55), y: 0 },
    ]);
  });

  it('is drawn only when a point has a count, a count of 0 included', () => {
    expect(hasHardcore([point(35), point(45)])).toBe(false);
    expect(hasHardcore([point(35), point(45, 0)])).toBe(true);
    expect(hasHardcore([])).toBe(false);
  });
});
