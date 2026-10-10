import { HiscoreSkill } from '@osrs-tracker/models';
import { format } from 'date-fns';
import { formatNumberLegible } from '@app/common/format/number-format';
import { PeriodSummary } from './player-summary';
import { Period } from './player-view';

export interface StatTileView {
  label: string;
  value: string;
  sub: string;
  tone: 'muted' | 'up' | 'down';
  tip?: string;
}

/**
 * The stat tiles above the player page: total level, XP gained over the period (compared with the period before it),
 * levels gained and boss kills. Without a summary (a single stored entry), the gains wait for the next check.
 */
export function statTilesFor(
  overall: HiscoreSkill,
  summary: PeriodSummary | undefined,
  period: Period,
): StatTileView[] {
  const totalLevel: StatTileView = {
    label: 'Total level',
    value: overall.level.toLocaleString('en-US'),
    sub: overall.rank !== null ? `Rank ${overall.rank.toLocaleString('en-US')}` : 'Unranked',
    tone: 'muted',
  };
  const since = summary?.since;
  const xpLabel = since ? `XP since ${format(since, 'd MMM')}` : `XP last ${period} days`;
  if (!summary) {
    return [
      totalLevel,
      { label: xpLabel, value: '–', sub: 'From the next check', tone: 'muted' },
      { label: 'Levels gained', value: '–', sub: '', tone: 'muted' },
      { label: 'Boss kills', value: '–', sub: '', tone: 'muted' },
    ];
  }

  const levelCount = summary.levels.reduce((total, { from, to }) => total + to - from, 0);
  const levels = summary.levels.map(({ skill, from, to }) => `${skill} ${from} → ${to}`).join(', ');
  return [
    totalLevel,
    {
      label: xpLabel,
      value: formatNumberLegible(summary.xp),
      tip: `${summary.xp.toLocaleString('en-US')} XP`,
      ...periodComparison(summary, period),
    },
    { label: 'Levels gained', value: String(levelCount), sub: levels, tip: levels, tone: 'muted' },
    {
      label: 'Boss kills',
      value: summary.bossKills.toLocaleString('en-US'),
      sub: summary.mostKilled ? `Most: ${summary.mostKilled.name} (${summary.mostKilled.kills})` : '',
      tone: 'muted',
    },
  ];
}

/** Compared with the period before it, e.g. "+24% vs previous week"; 60 days back is as far as the history goes */
function periodComparison(summary: PeriodSummary, period: Period): Pick<StatTileView, 'sub' | 'tone'> {
  const { xp, previousXp } = summary;
  const previous = period === 7 ? 'week' : `${period} days`;
  if (previousXp === undefined) return { sub: '', tone: 'muted' };
  if (!previousXp)
    return { sub: xp ? `None the ${previous} before` : `None the ${previous} before either`, tone: 'muted' };

  const change = Math.round(((xp - previousXp) / previousXp) * 100);
  if (!change) return { sub: `Same as previous ${previous}`, tone: 'muted' };
  return {
    sub: `${change > 0 ? '+' : '−'}${Math.abs(change)}% vs previous ${previous}`,
    tone: change > 0 ? 'up' : 'down',
  };
}
