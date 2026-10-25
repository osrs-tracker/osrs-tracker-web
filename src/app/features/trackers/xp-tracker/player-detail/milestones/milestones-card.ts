import { formatDate } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, LOCALE_ID } from '@angular/core';
import { HiscoreEntry } from '@osrs-tracker/models';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { formatNumberShort, formatWhole } from '@app/common/format/number-format';
import { capitalise } from '@app/common/format/player-labels';
import { Icon } from '@app/common/icon/icon';
import { ThemeStore } from '@app/common/theme/theme-store';
import { Card } from '@app/common/ui/cards/card';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { InfoTooltip } from '@app/common/ui/tooltip/info-tooltip';
import { ChartSkill, SKILL_COLORS } from '../colors/skill-colors';
import { Period, PlayerView } from '../player-view';
import { Milestone, milestones, MilestoneTarget } from './milestones';

const DAY = 24 * 60 * 60 * 1000;
const SHOWN = 6;

const TARGETS: SegmentedOption<MilestoneTarget>[] = [
  { value: 'next', label: 'Next level' },
  { value: '99', label: '99' },
  { value: '200m', label: '200M' },
];
const PERIODS: Period[] = [7, 30, 60, 90];

interface MilestoneRow {
  skill: string;
  /** The icon tile's outline: the skill's chart colour, or `undefined` for a skill without one (a new one) */
  color?: string;
  milestone: string;
  now?: string;
  pace: string;
  date: string;
  left: string;
}

@Component({
  selector: 'milestones-card',
  templateUrl: './milestones-card.html',
  imports: [Card, Icon, InfoTooltip, Segmented, Skeleton],
  host: { class: 'block min-w-0' },
})
export class MilestonesCard {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly locale = inject(LOCALE_ID);
  private readonly darkMode = inject(ThemeStore).darkMode;
  readonly playerView = inject(PlayerView);

  readonly username = input.required<string>();
  /** `undefined` while the hiscores load */
  readonly current = input.required<HiscoreEntry | undefined>();
  readonly entries = input.required<HiscoreEntry[]>();
  /** The card's period is loaded (or as much of it as there is) */
  readonly loaded = input.required<boolean>();
  /** The milestones are counted from the last check */
  readonly lastCheckedAt = input.required<Date | undefined>();

  readonly targets: SegmentedOption<MilestoneTarget>[] = TARGETS;
  readonly periods: Period[] = PERIODS;
  readonly skeletonRows: string[] = ['w-24', 'w-20', 'w-28', 'w-22'];

  readonly period = this.playerView.milestonePeriod;
  readonly result = computed(() => {
    const current = this.current();
    return current && this.loaded() ? milestones(current, this.entries(), this.period()) : undefined;
  });
  readonly empty = computed(
    () => !!this.result() && TARGETS.every(({ value }) => !this.result()!.targets[value].length),
  );

  /** A computed, so the target below resets only when it changes */
  private readonly firstTarget = computed(
    () => TARGETS.find(({ value }) => this.result()?.targets[value].length)?.value ?? TARGETS[0].value,
  );
  readonly target = linkedSignal(() => this.firstTarget());
  readonly expanded = linkedSignal({
    source: () => ({ period: this.period(), target: this.target() }),
    computation: () => false,
  });

  readonly picked = computed(() => this.result()?.targets[this.target()] ?? []);
  readonly rows = computed(() => {
    const picked = this.picked();
    const theme = this.darkMode() ? 'dark' : 'light';
    return (this.expanded() ? picked : picked.slice(0, SHOWN)).map(milestone => this.row(milestone, theme));
  });
  readonly hasMore = computed(() => this.picked().length > SHOWN);

  readonly paceLine = computed(() => `At ${capitalise(this.username())}’s pace`);
  readonly emptyHint = computed(() =>
    this.period() < 90
      ? 'There’s nothing to project from yet. A longer period may have some.'
      : 'There’s nothing to project from yet.',
  );
  readonly noRowsText = computed(() =>
    this.target() === '200m'
      ? 'Every skill with XP this period is at 200M.'
      : `Every skill with XP in the last ${this.period()} days is 99 already. Pick 200M.`,
  );

  setPeriod(value: string): void {
    this.playerView.setMilestonePeriod(Number(value) as Period);
  }

  pickTarget(target: MilestoneTarget): void {
    this.target.set(target);
    this.analyticsService.trackOption('milestone_target', target);
  }

  private row(milestone: Milestone, theme: 'dark' | 'light'): MilestoneRow {
    const { skill, goal, level, xp, pace, daysLeft, far } = milestone;
    const date = far ? '10+ years' : this.dateIn(daysLeft);
    return {
      skill,
      color: SKILL_COLORS[skill as ChartSkill]?.[theme],
      milestone: goal === '200M' ? goal : `${level} → ${goal}`,
      now: goal === '200M' ? `${formatNumberShort(xp)} XP now ·` : undefined,
      pace: `${formatNumberShort(Math.round(pace))} XP a day`,
      date,
      left: far ? 'at this pace' : daysLeft === 1 ? 'tomorrow' : `in ${formatWhole(daysLeft)} days`,
    };
  }

  /** In the visitor's time zone */
  private dateIn(days: number): string {
    const date = new Date((this.lastCheckedAt()?.getTime() ?? Date.now()) + days * DAY);
    const thisYear = date.getFullYear() === new Date().getFullYear();
    return formatDate(date, thisYear ? 'd MMM' : 'd MMM y', this.locale);
  }
}
