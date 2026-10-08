import { ActivityEnum } from '@osrs-tracker/hiscores';
import { describe, expect, it } from 'vitest';
import { ACTIVITY_COLORS } from './activity-colors';
import { chartColors, distance, MIN_DISTANCE, oklab } from './chart-colors';

// Two slayer bosses whose own colours are too close to tell apart
const HYDRA = ActivityEnum.AlchemicalHydra;
const KRAKEN = ActivityEnum.Kraken;

describe('chartColors', () => {
  it('keeps their own colours when they are far enough apart', () => {
    const colors = chartColors(
      [
        { name: ActivityEnum.KrilTsutsaroth, total: 10 },
        { name: ActivityEnum.CommanderZilyana, total: 5 },
      ],
      true,
    );
    expect(colors.get(ActivityEnum.KrilTsutsaroth)).toBe(ACTIVITY_COLORS[ActivityEnum.KrilTsutsaroth].dark);
    expect(colors.get(ActivityEnum.CommanderZilyana)).toBe(ACTIVITY_COLORS[ActivityEnum.CommanderZilyana].dark);
  });

  it.each([true, false])('gives the smaller total a clear fallback when two are too close (dark: %s)', dark => {
    const theme = dark ? 'dark' : 'light';
    expect(distance(oklab(ACTIVITY_COLORS[HYDRA][theme]), oklab(ACTIVITY_COLORS[KRAKEN][theme]))).toBeLessThan(
      MIN_DISTANCE,
    );

    const colors = chartColors(
      [
        { name: KRAKEN, total: 3 },
        { name: HYDRA, total: 40 },
      ],
      dark,
    );
    expect(colors.get(HYDRA)).toBe(ACTIVITY_COLORS[HYDRA][theme]);
    expect(distance(oklab(colors.get(HYDRA)!), oklab(colors.get(KRAKEN)!))).toBeGreaterThanOrEqual(MIN_DISTANCE);
  });

  it('assigns the same colours whatever the order it gets them in', () => {
    const series = [
      { name: HYDRA, total: 7 },
      { name: KRAKEN, total: 7 },
      { name: ActivityEnum.Cerberus, total: 2 },
    ];
    expect(chartColors([...series].reverse(), true)).toEqual(chartColors(series, true));
  });
});
