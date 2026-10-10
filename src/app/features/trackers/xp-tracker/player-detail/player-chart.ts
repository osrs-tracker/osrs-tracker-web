import { Component, computed, inject, input, InputSignal, Signal } from '@angular/core';
import { ActivityEnum, SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreEntry, skillProgress } from '@osrs-tracker/models';
import { format } from 'date-fns';
import { Segmented, SegmentedOption } from '@app/common/components/general/segmented';
import { Skeleton } from '@app/common/components/general/skeleton';
import { Icon } from '@app/common/directives/icon/icon';
import { formatNumberLegible } from '@app/common/helpers/number-format';
import { ActivityChart } from './player-logs/activity-chart';
import { CHART_CATEGORIES } from './player-logs/chart-categories';
import { activitySeries, xpGainedSeries } from './player-logs/log-chart-series';
import { XpGainedChart } from './player-logs/xp-gained-chart';
import { Gains } from './player-summary';
import { ActivityView, ChartView, Period, PlayerView } from './player-view';

const TITLES: Record<ChartView, string> = {
  skills: 'XP gained',
  bosses: 'Bosses',
  raids: 'Raids',
  clues: 'Clues',
  minigames: 'Minigames',
};

interface CategoryCopy {
  title: string;
  /** "All 5 bosses with gains" */
  noun: string;
  icon: ChartHeading['icon'];
  /** The title when one activity is shown, e.g. "Zulrah kills" */
  single: (name: string) => string;
  scoreLabel: string;
}

const CATEGORY_COPY: Record<Exclude<ActivityView, 'minigames'>, CategoryCopy> = {
  bosses: {
    title: 'Boss kills',
    noun: 'bosses',
    icon: { name: 'combat', activity: false },
    single: name => `${name} kills`,
    scoreLabel: 'Kill count',
  },
  raids: {
    title: 'Raids completed',
    noun: 'raids',
    icon: { name: ActivityEnum.ChambersOfXeric, activity: true },
    single: name => `${name} completions`,
    scoreLabel: 'Completed',
  },
  clues: {
    title: 'Clues completed',
    noun: 'tiers',
    icon: { name: ActivityEnum.ClueScrollsMaster, activity: true },
    // "Clue Scrolls (hard)" becomes "Hard clues completed"
    single: name =>
      `${name.replace(/^.*\((\w)(\w*)\)$/, (_, first: string, rest: string) => first.toUpperCase() + rest)} clues completed`,
    scoreLabel: 'Completed',
  },
};

/** The line above the chart: what's shown, for which period, and its total */
interface ChartHeading {
  icon: { name: string; skill?: boolean; activity?: boolean };
  title: string;
  sub: string;
  total: string;
}

/**
 * The chart card: it follows the page's last chartable pick (a tab, a skill or an activity) over the picked period.
 * From 1024px up it's as tall as the Skills card beside it, and the plot takes what the chips leave.
 */
@Component({
  selector: 'player-chart',
  template: `
    <div
      class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 min-h-14 px-5 py-1.5 border-b border-line"
    >
      <h2 class="text-xl font-bold text-strong">{{ title() }}</h2>
      <!-- also while a longer period loads, so the header keeps its place -->
      @if (state() !== 'empty') {
        <segmented
          label="Period"
          [options]="periods"
          [value]="playerView.period()"
          (valueChange)="playerView.period.set($event)"
        />
      }
    </div>

    @switch (state()) {
      @case ('loading') {
        <div class="flex flex-col grow min-h-0 gap-4 px-5 py-4.5" aria-hidden="true">
          <div class="flex items-center gap-3">
            <skeleton class="size-11 rounded-xl" />
            <div class="flex flex-col grow gap-2">
              <skeleton class="h-4 w-37.5" />
              <skeleton class="h-3 w-27.5" />
            </div>
            <skeleton class="h-7 w-24 rounded-lg" />
          </div>
          <skeleton class="h-55 lg:h-auto lg:grow rounded-xl" />
          <div class="flex flex-wrap gap-2">
            @for (width of ['w-24', 'w-21', 'w-23', 'w-26', 'w-22', 'w-20']; track $index) {
              <skeleton class="h-9 rounded-full" [class]="width" />
            }
          </div>
        </div>
      }
      @case ('empty') {
        <div class="flex flex-col grow items-center justify-center gap-4 px-8 py-10 text-center">
          <span class="flex items-center justify-center size-16 rounded-full bg-ground text-accent" aria-hidden="true">
            <svg
              class="size-7.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15.5 14" />
            </svg>
          </span>
          <div class="flex flex-col items-center gap-2">
            <h3 class="text-xl font-bold text-strong">No gains yet</h3>
            <p class="max-w-md text-base/6 text-muted">{{ emptyText() }}</p>
          </div>
        </div>
      }
      @case ('ready') {
        <div class="flex flex-col grow min-h-0 gap-4 px-5 py-4.5">
          @let h = heading();
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <span class="flex items-center justify-center size-11 shrink-0 rounded-xl bg-inner">
                <img
                  class="max-h-7 max-w-7"
                  icon
                  [name]="h.icon.name"
                  [skill]="!!h.icon.skill"
                  [activity]="!!h.icon.activity"
                />
              </span>
              <div class="flex flex-col gap-1 min-w-0">
                <h3 class="text-lg/6 font-bold text-strong">{{ h.title }}</h3>
                <span class="text-sm text-muted">{{ h.sub }}</span>
              </div>
            </div>
            <span class="text-3xl font-bold text-strong tabular-nums">{{ h.total }}</span>
          </div>

          @if (activityView(); as category) {
            <activity-chart [data]="diffs()" [category]="category" [minigame]="minigame()" />
          } @else {
            <xp-gained-chart [data]="diffs()" />
          }
        </div>
      }
    }
  `,
  host: { class: 'flex flex-col min-w-0 rounded-2xl bg-card overflow-hidden lg:h-115.5' },
  imports: [ActivityChart, Icon, Segmented, Skeleton, XpGainedChart],
})
export class PlayerChart {
  readonly playerView = inject(PlayerView);

  readonly periods: SegmentedOption<Period>[] = ([7, 30, 60] as const).map(days => ({
    value: days,
    label: `${days}D`,
    title: `Last ${days} days`,
  }));

  /** The period's daily diffs, newest first */
  readonly diffs: InputSignal<Gains[]> = input.required();
  /** The current stats, for levels and all-time scores */
  readonly current: InputSignal<HiscoreEntry | undefined> = input();
  /** Where the diffs start, when it isn't the period's first day: the history is shorter, or has a gap there */
  readonly since: InputSignal<Date | undefined> = input();
  /** `empty` until there's a second entry to compare with */
  readonly state: InputSignal<'loading' | 'empty' | 'ready'> = input.required();
  readonly emptyText: InputSignal<string> = input('');
  /** The charted minigame */
  readonly minigame: InputSignal<string | undefined> = input();

  readonly title: Signal<string> = computed(() => TITLES[this.playerView.chart()]);
  readonly activityView: Signal<ActivityView | undefined> = computed(() => {
    const chart = this.playerView.chart();
    return chart === 'skills' ? undefined : chart;
  });

  readonly heading: Signal<ChartHeading> = computed(() => {
    const since = this.since();
    const period = since ? `since ${format(since, 'd MMM')}` : `last ${this.playerView.period()} days`;
    const view = this.activityView();
    return view ? this.activityHeading(view, period) : this.xpHeading(period);
  });

  private xpHeading(period: string): ChartHeading {
    const skills = [...this.playerView.skills()];
    const xp = xpGainedSeries(this.diffs(), skills).reduce((sum, series) => sum + series.total, 0);
    const total = xp ? `+${formatNumberLegible(xp)}` : 'No XP';

    if (skills.length > 1) {
      const icon = { name: SkillEnum.Overall, skill: true };
      return { icon, title: `${skills.length} skills compared`, sub: `Combined, ${period}`, total };
    }

    const [name] = skills;
    if (name === SkillEnum.Overall) {
      return { icon: { name, skill: true }, title: 'Total XP gained', sub: `All skills, ${period}`, total };
    }

    const icon = { name, skill: true };
    const title = `${name} XP gained`;
    const current = this.current();
    if (!current) return { icon, title, sub: period, total };

    const { level, percentToNextLevel } = skillProgress(current.skills[name]);
    const progress =
      percentToNextLevel === null
        ? 'Level 99 · '
        : `Level ${level} · ${Math.floor(percentToNextLevel)}% to ${level + 1} · `;
    return { icon, title, sub: progress + period, total };
  }

  private activityHeading(view: ActivityView, period: string): ChartHeading {
    const series = activitySeries(this.diffs(), CHART_CATEGORIES[view]);
    const hidden = this.playerView.hidden();
    const shown =
      view === 'minigames'
        ? series.filter(({ name }) => name === this.minigame())
        : series.filter(({ name }) => !hidden.has(name));
    const sum = shown.reduce((total, { total: gained }) => total + gained, 0);
    const total = sum ? `+${sum.toLocaleString('en-US')}` : 'None';
    const score = (name: string): string => {
      const current = this.current();
      const value = current?.activities[name]?.score;
      return value != null ? value.toLocaleString('en-US') : '–';
    };

    if (view === 'minigames') {
      const name = this.minigame();
      if (!name) {
        const icon = { name: ActivityEnum.RiftsClosed, activity: true };
        return { icon, title: 'Minigames', sub: `No running totals gained · ${period}`, total };
      }
      const sub = `Total ${score(name)} · ${period}, one minigame at a time`;
      return { icon: { name, activity: true }, title: name, sub, total };
    }

    const copy = CATEGORY_COPY[view];
    if (shown.length === 1) {
      const [{ name }] = shown;
      const sub = `${copy.scoreLabel} ${score(name)} · ${period}`;
      return { icon: { name, activity: true }, title: copy.single(name), sub, total };
    }

    const count = !series.length
      ? `No ${copy.noun} with gains`
      : shown.length === series.length
        ? `All ${series.length} ${copy.noun} with gains`
        : `${shown.length} of ${series.length} ${copy.noun} with gains`;
    return { icon: copy.icon, title: copy.title, sub: `${count} · ${period}`, total };
  }
}
