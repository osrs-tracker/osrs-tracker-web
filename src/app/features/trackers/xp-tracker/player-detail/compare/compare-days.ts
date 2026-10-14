import { DecimalPipe, formatDate, isPlatformBrowser, Location } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  InputSignal,
  PLATFORM_ID,
  ResourceRef,
  Signal,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreEntry, skillProgress } from '@osrs-tracker/models';
import { differenceInCalendarDays } from 'date-fns';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { Icon } from '@app/common/icon/icon';
import { formatNumberLegible, formatNumberShort, formatSign, formatWhole } from '@app/common/format/number-format';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { DayPicker, PickerDay } from '@app/common/ui/controls/day-picker';
import { PERIOD_SIZE } from '../player-history';
import { activityRows, CompareRow, skillRows } from './compare-rows';
import { ComparePicks, NO_DAY, readComparePicks, writeComparePicks } from './compare-url';

type CompareTab = 'skills' | 'activities';

const TABS: SegmentedOption<CompareTab>[] = [
  { value: 'skills', label: 'Skills' },
  { value: 'activities', label: 'Activities' },
];

/** A stored check that can be picked */
interface DayOption extends PickerDay {
  entry: HiscoreEntry;
}

/** What two days changed: Overall, and the skills and activities that gained, biggest first */
interface Changes {
  overall: CompareRow;
  skills: CompareRow[];
  activities: CompareRow[];
}

/**
 * Compares the player's stats on two days of their history, or shows them on one. Shown in the day log's place (the
 * page's Days/Compare switch), it looks like a day card: the two days picked in its header with the XP and levels
 * gained between them, then what each skill and activity gained. "Show all stats" opens a table of every skill or
 * activity with its level or score, XP and rank, and what changed; one day shows that table at once.
 *
 * Only days with a stored check can be picked, so a gap in the history is skipped. The picks are in the URL
 * (`?day=2026-10-12&vs=2026-09-12`, `vs=none` for one day), so a comparison can be shared; they're written with
 * `Location.replaceState`, which doesn't navigate: a navigation would scroll to the top and count as a page view.
 * Opened from such a link, the card scrolls into view once loaded.
 *
 * The whole history is one request (about 40 KB compressed), made in the browser only: the first paint doesn't need it.
 */
@Component({
  selector: 'compare-days',
  template: `
    <article class="rounded-2xl bg-card">
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 min-h-14 px-5 py-3 border-b border-line">
        <div class="relative flex flex-wrap items-center gap-2">
          <day-picker
            label="Day"
            legend="XP since last check"
            [days]="options()"
            [value]="day()?.key"
            [other]="vs()?.key"
            (picked)="pick({ day: $event! })"
          />
          <span class="text-sm text-muted">compared with</span>
          <day-picker
            label="Compared with"
            noneLabel="No other day"
            legend="XP since last check"
            [days]="options()"
            [value]="vs()?.key"
            [other]="day()?.key"
            (picked)="pick({ vs: $event ?? NO_DAY })"
          />
        </div>
        @if (changes(); as changes) {
          @let levels = changes.overall.to - changes.overall.from!;
          <!-- the totals, as on a day card -->
          <div class="flex items-center gap-3.5">
            @if (levels > 0) {
              <span class="text-sm font-bold text-accent tabular-nums"
                >+{{ levels }} {{ levels === 1 ? 'level' : 'levels' }}</span
              >
            }
            <span class="flex items-center gap-1.5 font-bold text-strong tabular-nums">
              <img class="h-4.5 w-auto" icon [name]="SkillEnum.Overall" [skill]="true" />{{
                signed(changes.overall.gained!)
              }}
              <span class="sr-only">XP</span>
            </span>
          </div>
        }
      </div>

      @if (history.error()) {
        <load-error
          class="block px-5 py-4"
          source="player-compare"
          message="Couldn't load the history."
          (retry)="history.reload()"
        />
      } @else if (newer()) {
        @let diff = changes();
        @if (diff && !allStats()) {
          @if (diff.skills.length) {
            <ul class="grid grid-cols-log gap-x-6 gap-y-2 px-5 py-4">
              @for (row of diff.skills; track row.name) {
                <li class="flex items-center gap-2.5 min-h-6" [attr.title]="cellTitle(row, true)">
                  <span class="flex items-center justify-center size-6 shrink-0">
                    <img class="max-h-6 w-auto" icon [name]="row.name" [skill]="true" />
                  </span>
                  <span class="truncate">{{ row.name }}</span>
                  <span class="mr-auto text-sm font-bold text-accent tabular-nums">
                    @if (row.to > row.from!) {
                      +{{ row.to - row.from!
                      }}<span class="sr-only"> {{ row.to - row.from! === 1 ? 'level' : 'levels' }}</span>
                    }
                  </span>
                  <span class="font-bold text-strong tabular-nums">{{ signed(row.gained!) }}</span>
                </li>
              }
            </ul>
          }
          @if (diff.activities.length) {
            <!-- its own rows under a full-width line, as on a day card: scores and kill counts, not XP -->
            <ul class="grid grid-cols-log gap-x-6 gap-y-2 px-5 py-4 border-row" [class.border-t]="diff.skills.length">
              @for (row of diff.activities; track row.name) {
                <li class="flex items-center gap-2.5 min-h-6" [attr.title]="cellTitle(row, false)">
                  <span class="flex items-center justify-center size-6 shrink-0">
                    <img class="max-h-6 max-w-6" icon [name]="row.name" [activity]="true" />
                  </span>
                  <span class="mr-auto truncate">{{ row.name }}</span>
                  <span class="font-bold text-strong tabular-nums">+{{ row.gained | number }}</span>
                </li>
              }
            </ul>
          }
          @if (!diff.skills.length && !diff.activities.length) {
            <p class="px-5 py-4 text-base text-muted">Nothing was gained between these days.</p>
          }
        } @else {
          @let comparing = !!diff;
          <div class="px-5 pt-4 pb-2">
            <segmented label="Stats" [options]="tabs" [value]="tab()" (valueChange)="setTab($event)" />
          </div>
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-muted">
                <th class="py-2 pl-5 pr-1.5 sm:pr-3 font-normal" scope="col">
                  {{ tab() === 'skills' ? 'Skill' : 'Activity' }}
                </th>
                <th class="py-2 px-1.5 sm:px-3 font-normal text-right" scope="col">
                  {{ tab() === 'skills' ? 'Level' : 'Score' }}
                </th>
                @if (tab() === 'skills') {
                  <th
                    class="py-2 px-1.5 sm:px-3 font-normal text-right"
                    [class]="comparing ? 'max-sm:hidden' : ''"
                    scope="col"
                  >
                    XP
                  </th>
                }
                @if (comparing) {
                  <th class="py-2 px-1.5 sm:px-3 font-normal text-right" scope="col">Gained</th>
                }
                <th
                  class="py-2 pl-1.5 sm:pl-3 pr-5 font-normal text-right"
                  [class]="comparing ? 'max-sm:hidden' : ''"
                  scope="col"
                >
                  Rank
                </th>
              </tr>
            </thead>
            <tbody class="tabular-nums">
              @for (row of rows(); track row.name) {
                @let changed = !!row.gained;
                <tr class="border-t border-row">
                  <td class="max-w-0 w-full py-2 pl-5 pr-1.5 sm:pr-3">
                    <span class="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <span class="flex items-center justify-center size-6 shrink-0">
                        <img
                          class="max-h-6 max-w-6"
                          icon
                          [name]="row.name"
                          [skill]="tab() === 'skills'"
                          [activity]="tab() === 'activities'"
                        />
                      </span>
                      <!-- in a comparison, what didn't change steps back -->
                      <span
                        class="truncate"
                        [class]="comparing && !changed ? 'text-muted' : 'text-strong'"
                        [class.font-bold]="$first && tab() === 'skills'"
                        [attr.title]="row.name"
                        >{{ row.name }}</span
                      >
                    </span>
                  </td>
                  <td class="py-2 px-1.5 sm:px-3 text-right whitespace-nowrap">
                    @if (row.from !== undefined && row.from !== row.to) {
                      <span class="pr-1 text-muted">{{ row.from | number }} →</span>
                      <span class="font-bold text-strong">{{ row.to | number }}</span>
                    } @else {
                      <span class="text-strong">{{ row.to | number }}</span>
                    }
                  </td>
                  @if (tab() === 'skills') {
                    <td
                      class="py-2 px-1.5 sm:px-3 text-right whitespace-nowrap text-text"
                      [class]="comparing ? 'max-sm:hidden' : ''"
                    >
                      <!-- on phones only in the one-day view, short -->
                      <span class="sm:hidden" [attr.title]="row.xp | number">{{ legible(row.xp!) }}</span>
                      <span class="max-sm:hidden">{{ row.xp | number }}</span>
                    </td>
                  }
                  @if (comparing) {
                    <td
                      class="py-2 px-1.5 sm:px-3 text-right whitespace-nowrap"
                      [class]="!changed ? 'text-muted' : row.gained! > 0 ? 'font-bold text-up' : 'font-bold text-down'"
                      [attr.title]="changed ? signed(row.gained!, true) : null"
                    >
                      {{ changed ? signed(row.gained!) : '–' }}
                    </td>
                  }
                  <td
                    class="py-2 pl-1.5 sm:pl-3 pr-5 text-right whitespace-nowrap"
                    [class]="comparing ? 'max-sm:hidden' : ''"
                  >
                    @if (row.rank === null) {
                      <span class="text-muted">–</span>
                    } @else {
                      @if (row.rankChange) {
                        <span
                          class="max-sm:hidden pr-1.5 text-xs font-bold"
                          [class]="row.rankChange > 0 ? 'text-up' : 'text-down'"
                          [attr.title]="rankChangeTitle(row.rankChange)"
                          >{{ row.rankChange > 0 ? '▲' : '▼' }}{{ short(row.rankChange) }}</span
                        >
                      }
                      <span class="sm:hidden text-text" [attr.title]="row.rank | number">{{ short(row.rank) }}</span>
                      <span class="max-sm:hidden text-text">{{ row.rank | number }}</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr class="border-t border-row">
                  <td class="py-3 px-5 text-muted" colspan="5">Not ranked in any activity on these days.</td>
                </tr>
              }
            </tbody>
          </table>
        }

        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1 px-5 py-3 border-t border-line">
          @if (diff) {
            <button type="button" class="link text-sm font-bold" (click)="toggleAllStats()">
              {{ allStats() ? 'Show only what changed' : 'Show all stats' }}
            </button>
          } @else {
            <span class="text-sm text-muted">Pick a second day to see what changed.</span>
          }
        </div>
      } @else if (history.hasValue()) {
        <p class="px-5 py-4 text-base text-muted">No days are stored at this check time yet.</p>
      } @else {
        <div class="grid grid-cols-log gap-x-6 gap-y-2 px-5 py-4" aria-hidden="true">
          @for (row of [0, 1, 2, 3, 4, 5]; track row) {
            <skeleton class="h-6 w-full" />
          }
        </div>
      }
    </article>
  `,
  // the page's Days/Compare switch sits above it: a shared link scrolls to show both
  host: { class: 'block scroll-mt-28 sm:scroll-mt-40' },
  imports: [DayPicker, DecimalPipe, Icon, LoadError, Segmented, Skeleton],
})
export class CompareDays {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly username: InputSignal<string> = input.required();
  readonly offset: InputSignal<number> = input.required();
  /** Hidden on the page's Days view, which takes the picks out of the URL; shown again, it puts them back */
  readonly shown: InputSignal<boolean> = input.required();

  readonly tabs: SegmentedOption<CompareTab>[] = TABS;
  readonly NO_DAY: string = NO_DAY;
  readonly SkillEnum: typeof SkillEnum = SkillEnum;

  readonly tab: WritableSignal<CompareTab> = signal('skills');
  /** The full table instead of only what changed */
  readonly allStats: WritableSignal<boolean> = signal(false);
  /** The days picked by key; `undefined` takes the default: the newest day, compared with the oldest */
  private readonly picked: WritableSignal<ComparePicks> = signal(readComparePicks(this.router, this.location));

  readonly history: ResourceRef<HiscoreEntry[] | undefined> = rxResource({
    params: () => (this.isBrowser ? { username: this.username(), offset: this.offset() } : undefined),
    stream: ({ params }) => this.osrsTrackerRepo.getPlayerHiscores(params.username, params.offset, PERIOD_SIZE, 0),
  });

  /** The stored checks, newest first, with the XP each gained since the one before (its strength in the calendar) */
  readonly options: Signal<DayOption[]> = computed(() => {
    const entries = this.history.hasValue() ? this.history.value() : [];
    const overallXp = (entry: HiscoreEntry): number => skillProgress(entry.skills[SkillEnum.Overall]).xp;
    const gains = entries.map((entry, i) =>
      i + 1 < entries.length ? overallXp(entry) - overallXp(entries[i + 1]) : undefined,
    );
    const most = Math.max(0, ...gains.map(gained => gained ?? 0));
    return entries.map((entry, i) => ({
      key: dayKey(entry.date),
      // "Tue 13 Oct", in UTC like the key, so it matches its date in the calendar; Angular's en-US writes September
      // "Sep" as date-fns does on the rest of the page, where `Intl`'s en-GB writes "Sept"
      label: formatDate(entry.date, 'EEE d MMM', 'en-US', 'UTC'),
      gained: gains[i],
      // square-rooted, so a quieter day still shows next to the busiest
      heat: gains[i]! > 0 ? Math.ceil(Math.sqrt(gains[i]! / most) * 4) : 0,
      entry,
    }));
  });

  /** The picked day, or the newest; a day missing from the history (another offset, or since removed) falls back too */
  readonly day: Signal<DayOption | undefined> = computed(() => {
    const days = this.options();
    return days.find(day => day.key === this.picked().day) ?? days[0];
  });
  /**
   * The day compared with: the picked one, or the oldest; none when `vs=none`, or when the history has one day. A picked
   * day that turns out to be the day (its own pick fell back to the newest) falls back to the oldest too.
   */
  readonly vs: Signal<DayOption | undefined> = computed(() => {
    const days = this.options();
    const { vs } = this.picked();
    if (vs === NO_DAY) return undefined;
    const found = days.find(day => day.key === vs && day !== this.day()) ?? days.at(-1);
    return found === this.day() ? undefined : found;
  });

  /** Of the two days, the older; `undefined` for one day */
  readonly older: Signal<HiscoreEntry | undefined> = computed(() => {
    const [day, vs] = [this.day()?.entry, this.vs()?.entry];
    return day && vs ? (vs.date < day.date ? vs : day) : undefined;
  });
  readonly newer: Signal<HiscoreEntry | undefined> = computed(() => {
    const [day, vs] = [this.day()?.entry, this.vs()?.entry];
    return day && vs ? (vs.date < day.date ? day : vs) : day;
  });

  /** What changed between two days; `undefined` for one day */
  readonly changes: Signal<Changes | undefined> = computed(() => {
    const [newer, older] = [this.newer(), this.older()];
    if (!newer || !older) return undefined;
    const [overall, ...skills] = skillRows(newer, older);
    const gainedFirst = (a: CompareRow, b: CompareRow): number => b.gained! - a.gained!;
    return {
      overall,
      skills: skills.filter(row => row.gained! > 0).sort(gainedFirst),
      activities: activityRows(newer, older)
        .filter(row => row.gained! > 0)
        .sort(gainedFirst),
    };
  });

  /** The full table's rows, for the open tab */
  readonly rows: Signal<CompareRow[]> = computed(() => {
    const newer = this.newer();
    if (!newer) return [];
    return this.tab() === 'skills' ? skillRows(newer, this.older()) : activityRows(newer, this.older());
  });

  constructor() {
    // Shown again after Days took the picks out of the URL: put them back, once the days are known (before that, the
    // picks would be written as missing)
    effect(() => {
      if (this.shown() && this.history.hasValue()) untracked(() => this.writeUrl());
    });

    // Opened from a link with picked days: show the card once it has them
    if (this.picked().day) {
      const host = inject<ElementRef<HTMLElement>>(ElementRef);
      const injector = inject(Injector);
      let scrolled = false;
      effect(() => {
        if (scrolled || !this.history.hasValue()) return;
        scrolled = true;
        untracked(() =>
          afterNextRender(() => host.nativeElement.scrollIntoView({ block: 'start', behavior: 'smooth' }), {
            injector,
          }),
        );
      });
    }
  }

  setTab(tab: CompareTab): void {
    this.tab.set(tab);
    this.analyticsService.trackOption('compare_tab', tab);
  }

  toggleAllStats(): void {
    this.allStats.update(all => !all);
    this.analyticsService.trackOption('compare_view', this.allStats() ? 'all' : 'changes');
  }

  /** Picks a day or the day to compare with, and puts both in the URL */
  pick(change: ComparePicks): void {
    const [day, vs] = [this.day()?.key, this.vs()?.key ?? NO_DAY];
    // picking the other picker's day swaps the two (the calendars show it ringed); with no second day, a day can't be
    // compared with itself
    const swap = change.day === vs || change.vs === day;
    if (swap && vs === NO_DAY) return;
    this.picked.set(swap ? { day: vs, vs: day } : { day, vs, ...change });
    if (this.day()?.key === day && (this.vs()?.key ?? NO_DAY) === vs) return;

    this.writeUrl();
    const [newer, older] = [this.newer(), this.older()];
    this.analyticsService.trackEvent('compare_days', {
      days: newer && older ? differenceInCalendarDays(newer.date, older.date) : 0,
    });
  }

  /** Puts the days picked in the URL, once there are picks */
  writeUrl(): void {
    if (!this.picked().day) return;
    writeComparePicks(this.router, this.route, this.location, { day: this.day()?.key, vs: this.vs()?.key ?? NO_DAY });
  }

  /** "+1.2M", or with `full` "+1,204,330"; "+0" for no gain */
  signed(value: number, full = false): string {
    return formatSign(value, 'always') + (full ? formatWhole(Math.abs(value)) : formatNumberLegible(Math.abs(value)));
  }

  /** "1.2K", without a sign */
  short(value: number): string {
    return formatNumberShort(Math.abs(value));
  }

  /** "335.05M" */
  legible(value: number): string {
    return formatNumberLegible(value);
  }

  rankChangeTitle(change: number): string {
    return `${formatWhole(Math.abs(change))} places ${change > 0 ? 'up' : 'down'}`;
  }

  /** A cell's tooltip: "Slayer 90 → 92, +2,840,112 XP, rank 90,306 (71,000 places up)" */
  cellTitle(row: CompareRow, skill: boolean): string {
    const value = row.from === row.to ? formatWhole(row.to) : `${row.from} → ${row.to}`;
    const gained = skill ? `, ${this.signed(row.gained!, true)} XP` : '';
    const rank = row.rank === null ? '' : `, rank ${formatWhole(row.rank)}`;
    const change = row.rankChange ? ` (${this.rankChangeTitle(row.rankChange)})` : '';
    return `${row.name} ${value}${gained}${rank}${change}`;
  }
}

/** The check's UTC date, e.g. "2026-10-13": each offset checks once a day at a fixed UTC hour */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
