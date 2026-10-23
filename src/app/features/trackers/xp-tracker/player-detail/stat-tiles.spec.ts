import { HiscoreSkill } from '@osrs-tracker/models';
import { describe, expect, it } from 'vitest';
import { failedStatTilesFor, statTilesFor } from './stat-tiles';
import { PeriodSummary } from './player-summary';
import { Period } from './player-view';

const overall: HiscoreSkill = { xp: 200_000_000, level: 2277, rank: 12_345 };

const summary = (xp: number, previousXp?: number, extra: Partial<PeriodSummary> = {}): PeriodSummary => ({
  xp,
  previousXp,
  levels: [],
  bossKills: 0,
  ...extra,
});

/** The XP tile's comparison line and tone */
const comparison = (s: PeriodSummary, period: Period = 7): { sub: string; tone: string } => {
  const { sub, tone } = statTilesFor(overall, s, period)[1];
  return { sub, tone };
};

describe('statTilesFor', () => {
  it('compares the XP with the period before it', () => {
    expect(comparison(summary(124, 100))).toEqual({ sub: '+24% vs previous week', tone: 'up' });
    expect(comparison(summary(50, 100), 30)).toEqual({ sub: '−50% vs previous 30 days', tone: 'down' });
    expect(comparison(summary(100, 100))).toEqual({ sub: 'Same as previous week', tone: 'muted' });
  });

  it('says when the period before gained nothing', () => {
    expect(comparison(summary(100, 0))).toEqual({ sub: 'None the week before', tone: 'muted' });
    expect(comparison(summary(0, 0), 30)).toEqual({ sub: 'None the 30 days before either', tone: 'muted' });
  });

  it("doesn't compare when the history doesn't cover the period before", () => {
    expect(comparison(summary(100))).toEqual({ sub: '', tone: 'muted' });
  });

  it('offers a retry when the period before failed to load, unless there was nothing to compare', () => {
    expect(statTilesFor(overall, summary(100), 7, true)[1]).toMatchObject({ sub: '', comparisonFailed: true });
    // loaded through the longer history after all
    expect(statTilesFor(overall, summary(124, 100), 7, true)[1]).toMatchObject({ sub: '+24% vs previous week' });
    // cut short: no comparison either way
    expect(statTilesFor(overall, summary(100, undefined, { since: new Date() }), 7, true)[1].comparisonFailed).toBe(
      undefined,
    );
  });

  it('shows the total level and no gains when the history failed', () => {
    const [total, xp, levels, kills] = failedStatTilesFor(overall, 30);
    expect(total).toMatchObject({ value: '2,277', sub: 'Rank 12,345' });
    expect(xp).toMatchObject({ label: 'XP last 30 days', value: '–', sub: 'Not loaded' });
    expect([levels.value, kills.value]).toEqual(['–', '–']);
    // the live hiscores failed too
    expect(failedStatTilesFor(undefined, 7)[0]).toMatchObject({ label: 'Total level', value: '–', sub: 'Not loaded' });
  });

  it('waits for the next check without a summary', () => {
    const [total, xp, levels, kills] = statTilesFor({ ...overall, rank: null }, undefined, 7);
    expect(total).toMatchObject({ value: '2,277', sub: 'Unranked' });
    expect(xp).toMatchObject({ label: 'XP last 7 days', value: '–', sub: 'From the next check' });
    expect([levels.value, kills.value]).toEqual(['–', '–']);
  });

  it('sums the levels and names the most killed boss', () => {
    const tiles = statTilesFor(
      overall,
      summary(1_500_000, undefined, {
        since: new Date(2026, 9, 4),
        levels: [
          { skill: 'Sailing', from: 80, to: 82 },
          { skill: 'Agility', from: 70, to: 71 },
        ],
        bossKills: 1_234,
        mostKilled: { name: 'Vorkath', kills: 1_000 },
      }),
      30,
    );
    expect(tiles[0]).toMatchObject({ value: '2,277', sub: 'Rank 12,345' });
    expect(tiles[1]).toMatchObject({ label: 'XP since 4 Oct', value: '1.5M', tip: '1,500,000 XP' });
    expect(tiles[2]).toMatchObject({
      value: '3',
      sub: 'Sailing 80 → 82, Agility 70 → 71',
      subTip: 'Sailing 80 → 82\nAgility 70 → 71',
    });
    expect(tiles[3]).toMatchObject({ value: '1,234', sub: 'Most: Vorkath (1,000)' });
  });
});
