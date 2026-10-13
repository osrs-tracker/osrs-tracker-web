import { Grid, GridCell, GridCellWidget, GridRow } from '@angular/aria/grid';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  Signal,
  signal,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { formatNumberLegible } from '@app/common/format/number-format';

/** A day with a stored check, as the picker shows it */
export interface PickerDay {
  /** The check's UTC date, e.g. "2026-10-13" */
  key: string;
  /** "Tue 13 Oct" */
  label: string;
  /** Overall XP gained since the check before; `undefined` for the oldest */
  gained?: number;
  /** How much was gained, 0 (nothing) to 4 (the most in the history) */
  heat: number;
}

interface CalendarCell {
  /** The day of the month; `undefined` before the 1st and after the last */
  date?: number;
  key?: string;
  /** Only days with a check can be picked */
  day?: PickerDay;
  /** The tint between the two picked days, a half cell at either end */
  band?: string;
  /** Rounds the tint where a week or the month starts or ends */
  bandEdge?: string;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = [
  ...['January', 'February', 'March', 'April', 'May', 'June'],
  ...['July', 'August', 'September', 'October', 'November', 'December'],
];
/** The heat bar's strength per step: a see-through accent, so it keeps its hue on either theme */
const HEAT_MIX = [0, 35, 55, 78, 100];
const BAND = 'color-mix(in oklch, var(--accent) 12%, transparent)';

/**
 * A day picked from a month calendar: a 32px button opening a floating calendar under it (under the nearest positioned
 * ancestor on phones, e.g. the row of pickers, so it stays inside the card). Either only the given `days` can be picked
 * (Compare: the days with a stored check), each with a bar under its date as strong as its `heat`, so the busy days
 * stand out; or every day in `range` (the news catch-up). The day picked in the other picker is ringed, and the days
 * between the two are tinted, which shows the span being compared. A year dropdown in the header jumps between years
 * when the days span more than one. `variant="inline"` is a plain trigger for a control that draws its own frame (the
 * news page's pill).
 *
 * The calendar is an `@angular/aria` grid: the arrow keys move between the days that can be picked (the others are
 * hard-disabled, so they're skipped), Page Up and Page Down change the month, Enter or Space picks. It opens on the
 * picked day; Escape, a click outside or focus leaving it closes it.
 */
@Component({
  selector: 'day-picker',
  template: `
    <button
      #trigger
      type="button"
      class="flex items-center gap-2 font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent"
      [class]="
        variant() === 'inline'
          ? 'max-sm:justify-center w-full h-full px-4 rounded-full'
          : 'h-8 pl-2.5 pr-2 rounded-xl border border-line bg-card text-strong tabular-nums hover:bg-row disabled:cursor-default disabled:text-muted disabled:hover:bg-card'
      "
      aria-haspopup="dialog"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="value() || !placeholder() ? label() + ': ' + valueLabel() : placeholder()"
      [disabled]="!days().length && !range()"
      (click)="toggle($event)"
    >
      <svg
        class="size-4 shrink-0"
        [class]="variant() === 'inline' ? 'text-accent' : 'text-muted'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </svg>
      {{ valueLabel() }}
      <svg
        class="size-4 shrink-0 text-muted transition-transform motion-reduce:transition-none"
        [class.hidden]="variant() === 'inline'"
        [class.rotate-180]="open()"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    @if (open()) {
      <div
        class="absolute z-10 top-full mt-2 w-76 max-xs:w-69 p-3 rounded-2xl border border-line bg-card shadow-float font-normal text-left"
        [class]="align() === 'end' ? 'left-0 sm:left-auto sm:right-0' : 'left-0'"
        role="dialog"
        [attr.aria-label]="label()"
        (keydown)="onKeydown($event)"
      >
        <div class="flex items-center justify-between pb-2">
          <button
            type="button"
            class="flex items-center justify-center size-8 rounded-full text-strong hover:bg-row aria-disabled:text-muted aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:cursor-default"
            aria-label="Previous month"
            [attr.aria-disabled]="!previousMonth()"
            (click)="showMonth(previousMonth())"
          >
            <svg
              class="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
          @if (years().length > 1) {
            <span class="flex items-center gap-1.5 font-bold text-strong">
              <span aria-live="polite">{{ monthName() }}</span>
              <select
                class="h-8 py-0 pl-2 pr-7 rounded-xl border-line bg-card text-sm font-bold text-strong cursor-pointer hover:bg-row focus:border-accent focus:ring-accent"
                aria-label="Year"
                (change)="showYear($any($event.target).value)"
              >
                @for (year of years(); track year) {
                  <option [value]="year" [selected]="year === shownMonth().slice(0, 4)">{{ year }}</option>
                }
              </select>
            </span>
          } @else {
            <span class="font-bold text-strong" aria-live="polite">{{ monthTitle() }}</span>
          }
          <button
            type="button"
            class="flex items-center justify-center size-8 rounded-full text-strong hover:bg-row aria-disabled:text-muted aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:cursor-default"
            aria-label="Next month"
            [attr.aria-disabled]="!nextMonth()"
            (click)="showMonth(nextMonth())"
          >
            <svg
              class="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>

        <div class="grid grid-cols-7 pb-1 text-xs/6 text-center text-muted" aria-hidden="true">
          @for (weekday of weekdays; track weekday) {
            <span>{{ weekday }}</span>
          }
        </div>

        <!-- Only the shown month, a new grid per month (tracked by month): a range can hold years of months -->
        @for (calendar of calendars(); track calendar.month) {
          <div
            ngGrid
            class="flex flex-col gap-y-1"
            [attr.data-month]="calendar.month"
            colWrap="nowrap"
            rowWrap="nowrap"
            [softDisabled]="false"
            [attr.aria-label]="calendar.title"
          >
            @for (week of calendar.weeks; track $index) {
              <div ngGridRow class="grid grid-cols-7">
                @for (cell of week; track $index) {
                  <div
                    ngGridCell
                    role="gridcell"
                    class="flex justify-center"
                    [class]="cell.bandEdge ?? ''"
                    [disabled]="!cell.day"
                    [style.background]="cell.band ?? null"
                  >
                    @if (cell.day; as day) {
                      @let isValue = day.key === value();
                      @let isOther = day.key === other();
                      <button
                        ngGridCellWidget
                        type="button"
                        class="relative flex items-center justify-center size-10 max-xs:size-9 rounded-full tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-strong"
                        [class]="
                          isValue
                            ? 'bg-accent text-on-accent font-bold'
                            : isOther
                              ? 'ring-2 ring-inset ring-accent text-strong font-bold hover:bg-row'
                              : 'text-strong hover:bg-row'
                        "
                        [attr.data-key]="day.key"
                        [attr.aria-label]="dayLabel(day, isOther)"
                        [attr.aria-pressed]="isValue"
                        (click)="choose(day.key)"
                      >
                        {{ cell.date }}
                        @if (day.heat) {
                          <span
                            class="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-0.75 w-3.5 rounded-full"
                            [style.background]="heatColor(day.heat, isValue)"
                            aria-hidden="true"
                          ></span>
                        }
                      </button>
                    } @else if (cell.date) {
                      <!-- no check that day, or the other picker's day with nothing to swap it with -->
                      <span
                        class="flex items-center justify-center size-10 max-xs:size-9 rounded-full text-muted opacity-60 tabular-nums"
                        [class]="cell.key === other() ? 'ring-2 ring-inset ring-accent' : ''"
                      >
                        {{ cell.date }}
                      </span>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }

        @if (legend() || noneLabel()) {
          <div class="flex items-center justify-between gap-3 mt-2 pt-2.5 border-t border-line">
            @if (legend(); as legend) {
              <span class="flex items-center gap-2 text-xs text-muted">
                <span class="flex shrink-0 items-center gap-0.5" aria-hidden="true">
                  @for (heat of [1, 2, 3, 4]; track heat) {
                    <span class="h-0.75 w-2.5 rounded-full" [style.background]="heatColor(heat, false)"></span>
                  }
                </span>
                {{ legend }}
              </span>
            } @else {
              <span></span>
            }
            @if (noneLabel(); as none) {
              <button
                type="button"
                class="h-8 px-3 rounded-full text-sm font-bold whitespace-nowrap"
                [class]="value() ? 'text-accent hover:bg-row' : 'bg-accent text-on-accent'"
                [attr.aria-pressed]="!value()"
                (click)="choose(null)"
              >
                {{ none }}
              </button>
            }
          </div>
        }
      </div>
    }
  `,
  host: {
    'class': 'sm:relative',
    '(document:click)': 'closeOnOutsideClick($event)',
    '(focusout)': 'closeOnFocusOut($event)',
  },
  imports: [Grid, GridRow, GridCell, GridCellWidget],
})
export class DayPicker {
  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly injector = inject(Injector);
  private readonly trigger: Signal<ElementRef<HTMLButtonElement>> = viewChild.required('trigger');

  /** What's picked, e.g. "Day"; names the button and the calendar */
  readonly label: InputSignal<string> = input.required();
  /** The days that can be picked, newest first; or none, with `range` */
  readonly days: InputSignal<PickerDay[]> = input<PickerDay[]>([]);
  /** Every day from `from` to `to` (`YYYY-MM-DD`) can be picked, instead of only the `days` */
  readonly range: InputSignal<{ from: string; to: string } | undefined> = input<{ from: string; to: string }>();
  /** The picked day's key; `undefined` for none */
  readonly value: InputSignal<string | undefined> = input.required();
  /** The other picker's day, ringed, with the days between the two tinted */
  readonly other: InputSignal<string | undefined> = input<string | undefined>();
  /** When set, a button that picks no day, and the button's text while none is picked */
  readonly noneLabel: InputSignal<string | undefined> = input<string | undefined>();
  /** The button's text and name while no day is picked, without a button for none (e.g. "Since you last played") */
  readonly placeholder: InputSignal<string | undefined> = input<string | undefined>();
  /** Before the picked day's label on the button, e.g. "Since " */
  readonly prefix: InputSignal<string> = input('');
  /** The day the calendar opens on while none is picked; else the newest */
  readonly openAt: InputSignal<string | undefined> = input<string | undefined>();
  /** Under the calendar, what the heat bars mean; none without */
  readonly legend: InputSignal<string | undefined> = input<string | undefined>();
  readonly variant: InputSignal<'default' | 'inline'> = input<'default' | 'inline'>('default');
  /** Which edge of the button the calendar lines up with from 640px; on phones it's under the positioned ancestor */
  readonly align: InputSignal<'start' | 'end'> = input<'start' | 'end'>('start');
  /** A day's key, or `null` for none */
  readonly picked: OutputEmitterRef<string | null> = output();

  readonly weekdays: string[] = WEEKDAYS;
  readonly open: WritableSignal<boolean> = signal(false);
  /** The month shown, e.g. "2026-10" */
  readonly shownMonth: WritableSignal<string> = signal('');

  private readonly byKey: Signal<Map<string, PickerDay>> = computed(
    () => new Map(this.days().map(day => [day.key, day])),
  );
  /** The months with a day to pick, oldest first */
  private readonly months: Signal<string[]> = computed(() => {
    const range = this.range();
    if (!range) return [...new Set(this.days().map(day => day.key.slice(0, 7)))].sort();

    const months: string[] = [];
    let [year, month] = range.from.split('-').map(Number);
    for (let key = range.from.slice(0, 7); key <= range.to.slice(0, 7);) {
      months.push(key);
      [year, month] = month === 12 ? [year + 1, 1] : [year, month + 1];
      key = `${year}-${String(month).padStart(2, '0')}`;
    }
    return months;
  });
  /** The years with a day to pick, oldest first */
  readonly years: Signal<string[]> = computed(() => [...new Set(this.months().map(month => month.slice(0, 4)))]);

  readonly valueLabel: Signal<string> = computed(() => {
    const value = this.value();
    const day = value && this.dayOf(value);
    return day ? this.prefix() + day.label : (this.placeholder() ?? this.noneLabel() ?? '–');
  });
  readonly monthTitle: Signal<string> = computed(() => monthTitle(this.shownMonth()));
  readonly monthName: Signal<string> = computed(() => MONTH_NAMES[Number(this.shownMonth().slice(5)) - 1] ?? '');
  readonly previousMonth: Signal<string | undefined> = computed(() =>
    this.months()
      .filter(month => month < this.shownMonth())
      .at(-1),
  );
  readonly nextMonth: Signal<string | undefined> = computed(() =>
    this.months().find(month => month > this.shownMonth()),
  );

  /** The shown month as its weeks, Monday first (a list, so the grid is recreated per month) */
  readonly calendars: Signal<{ month: string; title: string; weeks: CalendarCell[][] }[]> = computed(() => {
    const month = this.shownMonth();
    return month ? [{ month, title: monthTitle(month), weeks: this.weeksOf(month) }] : [];
  });

  private weeksOf(month: string): CalendarCell[][] {
    const [year, monthIndex] = month.split('-').map(Number);
    const length = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
    const lead = (new Date(Date.UTC(year, monthIndex - 1, 1)).getUTCDay() + 6) % 7;
    const [from, to] = [this.value(), this.other()].sort();
    const spans = !!from && !!to && from !== to;

    const cells: CalendarCell[] = Array.from({ length: lead }, () => ({}));
    for (let date = 1; date <= length; date++) {
      const key = `${month}-${String(date).padStart(2, '0')}`;
      const column = cells.length % 7;
      // an end's half band only reaches toward the range, so none where its week or month ends on that side
      const [weekStart, weekEnd] = [column === 0 || date === 1, column === 6 || date === length];
      const band = !spans
        ? undefined
        : key > from! && key < to!
          ? BAND
          : key === from && !weekEnd
            ? `linear-gradient(to right, transparent 50%, ${BAND} 50%)`
            : key === to && !weekStart
              ? `linear-gradient(to left, transparent 50%, ${BAND} 50%)`
              : undefined;
      const bandEdge =
        band === BAND ? `${weekStart ? 'rounded-l-full' : ''} ${weekEnd ? 'rounded-r-full' : ''}` : undefined;
      // the other picker's day swaps the two when picked, so with none picked here there's nothing to swap
      const day = key === this.other() && !this.value() ? undefined : this.dayOf(key);
      cells.push({ date, key, day, band, bandEdge });
    }
    while (cells.length % 7) cells.push({});
    return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
  }

  /** Opened by a click, the picked day gets focus without a ring; by the keyboard (no click `detail`), with one */
  toggle(event: MouseEvent): void {
    if (this.open()) return this.close(false);
    const opensOn = this.value() ?? this.other() ?? this.openAt() ?? this.days()[0]?.key ?? this.range()!.to;
    this.shownMonth.set(this.months().includes(opensOn.slice(0, 7)) ? opensOn.slice(0, 7) : this.months().at(-1)!);
    this.open.set(true);
    this.focusDay(event.detail === 0);
  }

  choose(key: string | null): void {
    if (key !== (this.value() ?? null)) this.picked.emit(key);
    this.close(true);
  }

  showMonth(month: string | undefined): void {
    if (month) this.shownMonth.set(month);
  }

  /** The same month in `year`, else that year's nearest one */
  showYear(year: string): void {
    const months = this.months().filter(month => month.startsWith(year));
    const target = `${year}${this.shownMonth().slice(4)}`;
    this.shownMonth.set(months.find(month => month >= target) ?? months.at(-1)!);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.close(true);
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      const month = event.key === 'PageUp' ? this.previousMonth() : this.nextMonth();
      if (!month) return;
      this.shownMonth.set(month);
      this.focusDay(true);
    }
  }

  dayLabel(day: PickerDay, other: boolean): string {
    const gained =
      day.gained === undefined ? '' : `, ${day.gained > 0 ? `+${formatNumberLegible(day.gained)}` : 'no'} XP`;
    return `${day.label}${gained}${other ? ', the other day picked' : ''}`;
  }

  /** The heat bar: the accent at the step's strength, or the text colour on the picked (accent) day */
  heatColor(heat: number, onAccent: boolean): string {
    return `color-mix(in oklch, var(${onAccent ? '--on-accent' : '--accent'}) ${HEAT_MIX[heat]}%, transparent)`;
  }

  closeOnOutsideClick(event: Event): void {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target as Node)) this.close(false);
  }

  closeOnFocusOut(event: FocusEvent): void {
    // a month change re-renders the grid: focus on a removed day lands on nothing, not outside
    const next = event.relatedTarget as Node | null;
    if (this.open() && next && !this.elementRef.nativeElement.contains(next)) this.close(false);
  }

  private close(refocus: boolean): void {
    this.open.set(false);
    if (refocus) this.trigger().nativeElement.focus();
  }

  /** A pickable day: one of `days`, or any in `range`, labelled like "1 September 2026" */
  private dayOf(key: string): PickerDay | undefined {
    const range = this.range();
    if (!range) return this.byKey().get(key);
    if (key < range.from || key > range.to) return undefined;
    const [year, month, date] = key.split('-').map(Number);
    return { key, label: `${date} ${MONTH_NAMES[month - 1]} ${year}`, heat: 0 };
  }

  /** Focuses the picked day once rendered, else `openAt`, else the shown month's newest day */
  private focusDay(focusVisible: boolean): void {
    afterNextRender(
      () => {
        const month = this.elementRef.nativeElement.querySelector(`[data-month="${this.shownMonth()}"]`);
        const buttons = month?.querySelectorAll<HTMLElement>('[data-key]') ?? [];
        const picked = month?.querySelector<HTMLElement>(`[data-key="${this.value() ?? this.openAt()}"]`);
        (picked ?? buttons[buttons.length - 1])?.focus({ focusVisible });
      },
      { injector: this.injector },
    );
  }
}

/** "October 2026" for "2026-10" */
function monthTitle(month: string): string {
  const [year, index] = month.split('-').map(Number);
  return `${MONTH_NAMES[index - 1]} ${year}`;
}
