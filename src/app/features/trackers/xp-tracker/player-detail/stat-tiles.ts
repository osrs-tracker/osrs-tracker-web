import { HiscoreSkill } from '@osrs-tracker/models';
import { format } from 'date-fns';
import { formatNumberLegible, formatSign, formatWhole } from '@app/common/format/number-format';
import { PeriodSummary } from './player-summary';
import { Period } from './player-view';

export interface StatTileView {
  label: string;
  value: string;
  sub: string;
  tone: 'muted' | 'up' | 'down';
  tip?: string;
  /** The whole line, for when it's cut off; one item per line */
  subTip?: string;
  comparisonFailed?: boolean;
}

export function statTilesFor(
  overall: HiscoreSkill,
  summary: PeriodSummary | undefined,
  period: Period,
  comparisonFailed = false,
): StatTileView[] {
  const totalLevel = totalLevelTile(overall);
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
  const levels = summary.levels.map(({ skill, from, to }) => `${skill} ${from} → ${to}`);
  return [
    totalLevel,
    {
      label: xpLabel,
      value: formatNumberLegible(summary.xp),
      tip: `${formatWhole(summary.xp)} XP`,
      // a period cut short by the history's start or a gap has nothing to compare with anyway
      ...(comparisonFailed && !summary.since && summary.previousXp === undefined
        ? { sub: '', tone: 'muted', comparisonFailed }
        : periodComparison(summary, period)),
    },
    {
      label: 'Levels gained',
      value: String(levelCount),
      sub: levels.join(', '),
      subTip: levels.join('\n'),
      tone: 'muted',
    },
    {
      label: 'Boss kills',
      value: formatWhole(summary.bossKills),
      sub: summary.mostKilled ? `Most: ${summary.mostKilled.name} (${formatWhole(summary.mostKilled.kills)})` : '',
      tone: 'muted',
    },
  ];
}

export function failedStatTilesFor(overall: HiscoreSkill | undefined, period: Period): StatTileView[] {
  const notLoaded = (label: string): StatTileView => ({ label, value: '–', sub: 'Not loaded', tone: 'muted' });
  return [
    overall ? totalLevelTile(overall) : notLoaded('Total level'),
    notLoaded(`XP last ${period} days`),
    notLoaded('Levels gained'),
    notLoaded('Boss kills'),
  ];
}

function totalLevelTile(overall: HiscoreSkill): StatTileView {
  return {
    label: 'Total level',
    value: formatWhole(overall.level),
    sub: overall.rank !== null ? `Rank ${formatWhole(overall.rank)}` : 'Unranked',
    tone: 'muted',
  };
}

/** 90 days back is as far as the history goes, so only 7D and 30D compare */
function periodComparison(summary: PeriodSummary, period: Period): Pick<StatTileView, 'sub' | 'tone'> {
  const { xp, previousXp } = summary;
  const previous = period === 7 ? 'week' : `${period} days`;
  if (previousXp === undefined) return { sub: '', tone: 'muted' };
  if (!previousXp)
    return { sub: xp ? `None the ${previous} before` : `None the ${previous} before either`, tone: 'muted' };

  const change = Math.round(((xp - previousXp) / previousXp) * 100);
  if (!change) return { sub: `Same as previous ${previous}`, tone: 'muted' };
  return {
    sub: `${formatSign(change, 'exceptZero')}${Math.abs(change)}% vs previous ${previous}`,
    tone: change > 0 ? 'up' : 'down',
  };
}
