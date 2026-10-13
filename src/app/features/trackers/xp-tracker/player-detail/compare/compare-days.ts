import { DecimalPipe, isPlatformBrowser, Location } from '@angular/common';
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
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HiscoreEntry } from '@osrs-tracker/models';
import { differenceInCalendarDays, format } from 'date-fns';
import { Card } from '@app/common/ui/cards/card';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { Icon } from '@app/common/icon/icon';
import { formatNumberLegible, formatNumberShort } from '@app/common/format/number-format';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { PERIOD_SIZE } from '../player-history';
import { activityRows, CompareRow, skillRows } from './compare-rows';

type CompareTab = 'skills' | 'activities';

const TABS: SegmentedOption<CompareTab>[] = [
  { value: 'skills', label: 'Skills' },
  { value: 'activities', label: 'Activities' },
];

/** The `vs` query value for no second day */
const NO_DAY = 'none';

/** A stored check that can be picked */
interface DayOption {
  key: string;
  label: string;
  entry: HiscoreEntry;
}

/**
 * Compares the player's stats on two days of their history, or shows them on one: levels, XP, scores and ranks on the
 * newer day, and what changed since the older one. Only days with a stored check can be picked, so a gap in the history
 * is skipped.
 *
 * The picks are in the URL (`?day=2026-10-12&vs=2026-09-12`, `vs=none` for one day), so a comparison can be shared;
 * they're written with `Location.replaceState`, which doesn't navigate: a navigation would scroll to the top and count
 * as a page view. Opened from such a link, the card scrolls into view once loaded.
 *
 * The whole history is one request (about 40 KB compressed), made in the browser only: the first paint doesn't need it.
 */
@Component({
  selector: 'compare-days',
  template: `
    <article card [subtitle]="'From the daily checks at ' + trackedAt()">
      <h2 title>Compare days</h2>
      <segmented actions label="Compare" [options]="tabs" [value]="tab()" (valueChange)="setTab($event)" />

      @if (history.error()) {
        <load-error source="player-compare" message="Couldn't load the history." (retry)="history.reload()" />
      } @else {
        <div class="flex flex-wrap gap-x-6 gap-y-3 pb-4 text-sm text-muted">
          <label class="flex items-center gap-2">
            Day
            <select
              class="h-8 pl-2 pr-8 py-0 rounded-xl border-line bg-card font-bold text-strong tabular-nums cursor-pointer focus:border-accent focus:ring-accent disabled:cursor-default"
              [disabled]="!options().length"
              [ngModel]="day()?.key"
              (ngModelChange)="pick({ day: $event })"
            >
              @for (option of options(); track option.key) {
                <option [ngValue]="option.key">{{ option.label }}</option>
              }
            </select>
          </label>
          <label class="flex items-center gap-2">
            Compared with
            <select
              class="h-8 pl-2 pr-8 py-0 rounded-xl border-line bg-card font-bold text-strong tabular-nums cursor-pointer focus:border-accent focus:ring-accent disabled:cursor-default"
              [disabled]="!options().length"
              [ngModel]="vs()?.key ?? NO_DAY"
              (ngModelChange)="pick({ vs: $event })"
            >
              <option [ngValue]="NO_DAY">Nothing</option>
              @for (option of options(); track option.key) {
                @if (option.key !== day()?.key) {
                  <option [ngValue]="option.key">{{ option.label }}</option>
                }
              }
            </select>
          </label>
        </div>

        @if (rows(); as rows) {
          @let comparing = !!older();
          <p class="pb-3 text-base/6 text-strong">{{ heading() }}</p>
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-muted">
                <th class="py-2 pr-1.5 sm:pr-3 font-normal" scope="col">
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
                  class="py-2 pl-1.5 sm:pl-3 font-normal text-right"
                  [class]="comparing ? 'max-sm:hidden' : ''"
                  scope="col"
                >
                  Rank
                </th>
              </tr>
            </thead>
            <tbody class="tabular-nums">
              @for (row of rows; track row.name) {
                @let changed = !!row.gained;
                <tr class="border-t border-row">
                  <td class="max-w-0 w-full py-2 pr-1.5 sm:pr-3">
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
                      <span
                        class="truncate text-strong"
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
                    class="py-2 pl-1.5 sm:pl-3 text-right whitespace-nowrap"
                    [class]="comparing ? 'max-sm:hidden' : ''"
                  >
                    @if (row.rank === null) {
                      <span class="text-muted">–</span>
                    } @else {
                      @if (row.rankChange) {
                        <span
                          class="max-sm:hidden pr-1.5 text-xs font-bold"
                          [class]="row.rankChange > 0 ? 'text-up' : 'text-down'"
                          [attr.title]="rankChangeTitle(row)"
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
                  <td class="py-3 text-muted" colspan="5">Not ranked in any activity on these days.</td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="flex flex-col gap-3" aria-hidden="true">
            <skeleton class="h-5 w-64" />
            @for (row of [0, 1, 2, 3, 4, 5, 6, 7]; track row) {
              <skeleton class="h-6 w-full" />
            }
          </div>
        }
      }
    </article>
  `,
  host: { class: 'block scroll-mt-4 sm:scroll-mt-24' },
  imports: [Card, DecimalPipe, FormsModule, Icon, LoadError, Segmented, Skeleton],
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
  /** The UTC hour the visitor's offset is checked at, e.g. "02:00 UTC" */
  readonly trackedAt: InputSignal<string> = input.required();

  readonly tabs: SegmentedOption<CompareTab>[] = TABS;
  readonly NO_DAY: string = NO_DAY;

  readonly tab: WritableSignal<CompareTab> = signal('skills');
  /** The days picked by key; `undefined` takes the default: the newest day, compared with the oldest */
  private readonly picked: WritableSignal<{ day?: string; vs?: string }> = signal({
    day: this.route.snapshot.queryParamMap.get('day') ?? undefined,
    vs: this.route.snapshot.queryParamMap.get('vs') ?? undefined,
  });

  readonly history: ResourceRef<HiscoreEntry[] | undefined> = rxResource({
    params: () => (this.isBrowser ? { username: this.username(), offset: this.offset() } : undefined),
    stream: ({ params }) => this.osrsTrackerRepo.getPlayerHiscores(params.username, params.offset, PERIOD_SIZE, 0),
  });

  /** The stored checks, newest first */
  readonly options: Signal<DayOption[]> = computed(() =>
    (this.history.hasValue() ? this.history.value() : []).map(entry => ({
      key: dayKey(entry.date),
      label: format(entry.date, 'EEE d MMM'),
      entry,
    })),
  );

  /** The picked day, or the newest; a day missing from the history (another offset, or since removed) falls back too */
  readonly day: Signal<DayOption | undefined> = computed(() => {
    const days = this.options();
    return days.find(day => day.key === this.picked().day) ?? days[0];
  });
  /** The day compared with: the picked one, or the oldest; none when `vs=none` or it's the same day */
  readonly vs: Signal<DayOption | undefined> = computed(() => {
    const days = this.options();
    const { vs } = this.picked();
    if (vs === NO_DAY) return undefined;
    const found = days.find(day => day.key === vs) ?? days.at(-1);
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

  readonly rows: Signal<CompareRow[] | undefined> = computed(() => {
    const newer = this.newer();
    if (!newer) return undefined;
    return this.tab() === 'skills' ? skillRows(newer, this.older()) : activityRows(newer, this.older());
  });

  /** "Mon 15 Sep to Mon 13 Oct, 28 days", or "On Mon 13 Oct" */
  readonly heading: Signal<string> = computed(() => {
    const newer = this.newer();
    const older = this.older();
    if (!newer) return '';
    if (!older) return `On ${format(newer.date, 'EEE d MMM')}`;
    const days = differenceInCalendarDays(newer.date, older.date);
    return `${format(older.date, 'EEE d MMM')} to ${format(newer.date, 'EEE d MMM')}, ${days} ${days === 1 ? 'day' : 'days'}`;
  });

  constructor() {
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

  /** Picks a day or the day to compare with, and puts both in the URL */
  pick(change: { day?: string; vs?: string }): void {
    const [day, vs] = [this.day()?.key, this.vs()?.key ?? NO_DAY];
    // picking the day compared with as the day swaps the two
    this.picked.set(change.day === vs ? { day: vs, vs: day } : { day, vs, ...change });

    const url = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: { day: this.day()?.key, vs: this.vs()?.key ?? NO_DAY },
      queryParamsHandling: 'merge',
    });
    this.location.replaceState(this.router.serializeUrl(url));

    const [newer, older] = [this.newer(), this.older()];
    this.analyticsService.trackEvent('compare_days', {
      days: newer && older ? differenceInCalendarDays(newer.date, older.date) : 0,
    });
  }

  /** "+1.2M", or with `full` "+1,204,330" */
  signed(value: number, full = false): string {
    const number = full ? Math.abs(value).toLocaleString('en-US') : formatNumberLegible(Math.abs(value));
    return (value < 0 ? '−' : '+') + number;
  }

  /** "1.2K", without a sign */
  short(value: number): string {
    return formatNumberShort(Math.abs(value));
  }

  /** "335.05M" */
  legible(value: number): string {
    return formatNumberLegible(value);
  }

  rankChangeTitle(row: CompareRow): string {
    const change = row.rankChange!;
    return `${Math.abs(change).toLocaleString('en-US')} places ${change > 0 ? 'up' : 'down'}`;
  }
}

/** The check's UTC date, e.g. "2026-10-13": each offset checks once a day at a fixed UTC hour */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
