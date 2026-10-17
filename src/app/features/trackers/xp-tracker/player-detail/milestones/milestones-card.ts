import { formatDate } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, LOCALE_ID } from '@angular/core';
import { HiscoreEntry } from '@osrs-tracker/models';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { formatNumberShort, formatWhole } from '@app/common/format/number-format';
import { capitalise } from '@app/common/format/player-labels';
import { Icon } from '@app/common/icon/icon';
import { Card } from '@app/common/ui/cards/card';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { InfoTooltip } from '@app/common/ui/tooltip/info-tooltip';
import { Tooltip } from '@app/common/ui/tooltip/tooltip';
import { Period, PlayerView } from '../player-view';
import { Milestone, milestones, MilestoneTarget } from './milestones';

const DAY = 24 * 60 * 60 * 1000;
/** Rows shown before "Show all" */
const SHOWN = 6;

const TARGETS: SegmentedOption<MilestoneTarget>[] = [
  { value: 'next', label: 'Next level' },
  { value: '99', label: '99' },
  { value: '200m', label: '200M' },
];
const PERIODS: Period[] = [7, 30, 60, 90];

interface MilestoneRow {
  skill: string;
  /** "84 → 85", or "200M" */
  milestone: string;
  /** The pace, after the XP now for 200M */
  sub: string;
  date: string;
  left: string;
  /** "Sailing 85: 14 Oct" */
  tip: string;
  /** "16,000 XP a day over the last 7 days" */
  tipPace: string;
}

/**
 * When each skill reaches its next level, 99 or 200M XP at the player's pace: their average XP a day over the period
 * picked in the card's header, apart from the chart's. Skills without XP in that period are left out.
 */
@Component({
  selector: 'milestones-card',
  templateUrl: './milestones-card.html',
  imports: [Card, Icon, InfoTooltip, Segmented, Skeleton, Tooltip],
  host: { class: 'block min-w-0' },
})
export class MilestonesCard {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly locale = inject(LOCALE_ID);
  readonly playerView = inject(PlayerView);

  /** The player's display name */
  readonly username = input.required<string>();
  /** `undefined` while the hiscores load */
  readonly current = input.required<HiscoreEntry | undefined>();
  /** The stored daily entries, newest first */
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
  /** No skill has a milestone: none gained XP in the period */
  readonly empty = computed(
    () => !!this.result() && TARGETS.every(({ value }) => !this.result()!.targets[value].length),
  );

  /** The first target with milestones; a computed, so the target below resets only when it changes */
  private readonly firstTarget = computed(
    () => TARGETS.find(({ value }) => this.result()?.targets[value].length)?.value ?? TARGETS[0].value,
  );
  /** Starts on the first target with milestones, and again when another one is first after a change of period */
  readonly target = linkedSignal(() => this.firstTarget());
  /** "Show all"; another period or target shows fewer again */
  readonly expanded = linkedSignal({
    source: () => ({ period: this.period(), target: this.target() }),
    computation: () => false,
  });

  readonly picked = computed(() => this.result()?.targets[this.target()] ?? []);
  readonly rows = computed(() => {
    const picked = this.picked();
    return (this.expanded() ? picked : picked.slice(0, SHOWN)).map(milestone => this.row(milestone));
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

  private row(milestone: Milestone): MilestoneRow {
    const { skill, goal, level, xp, pace, daysLeft, far } = milestone;
    const days = this.result()!.days;
    const date = far ? '10+ years' : this.dateIn(daysLeft);
    const xpADay = `${formatNumberShort(Math.round(pace))} XP a day`;
    return {
      skill,
      milestone: goal === '200M' ? goal : `${level} → ${goal}`,
      sub: goal === '200M' ? `${formatNumberShort(xp)} XP now · ${xpADay}` : xpADay,
      date,
      left: far ? 'at this pace' : daysLeft === 1 ? 'tomorrow' : `in ${formatWhole(daysLeft)} days`,
      tip: `${skill} ${goal}: ${date}`,
      tipPace: `${formatWhole(pace)} XP a day over the last ${days === 1 ? 'day' : `${days} days`}`,
    };
  }

  /** The date `days` after the last check, in the visitor's time zone; the year only when it isn't this one */
  private dateIn(days: number): string {
    const date = new Date((this.lastCheckedAt()?.getTime() ?? Date.now()) + days * DAY);
    const thisYear = date.getFullYear() === new Date().getFullYear();
    return formatDate(date, thisYear ? 'd MMM' : 'd MMM y', this.locale);
  }
}
