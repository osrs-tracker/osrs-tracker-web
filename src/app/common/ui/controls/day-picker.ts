import { Grid, GridCell, GridCellWidget, GridRow } from '@angular/aria/grid';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { formatNumberLegible } from '@app/common/format/number-format';
import { LucideCalendar, LucideChevronDown, LucideChevronLeft, LucideChevronRight } from '@lucide/angular';

export interface PickerDay {
  /** UTC */
  key: string;
  label: string;
  /** Overall XP gained since the check before; `undefined` for the oldest */
  gained?: number;
  /** How much was gained, 0 (nothing) to 4 (the most in the history) */
  heat: number;
}

interface CalendarCell {
  date?: number;
  key?: string;
  day?: PickerDay;
  band?: string;
  bandEdge?: string;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = [
  ...['January', 'February', 'March', 'April', 'May', 'June'],
  ...['July', 'August', 'September', 'October', 'November', 'December'],
];
/** A see-through accent, so it keeps its hue on either theme */
const HEAT_MIX = [0, 35, 55, 78, 100];
const BAND = 'color-mix(in oklch, var(--accent) 12%, transparent)';

/**
 * Either only the given `days` can be picked (Compare), or every day in `range` (the news catch-up).
 * `variant="inline"` is a plain trigger for a control that draws its own frame. On phones the calendar floats under the
 * nearest positioned ancestor, so it stays inside the card. Its `@angular/aria` grid hard-disables the days that can't
 * be picked, so the arrow keys skip them.
 */
@Component({
  selector: 'day-picker',
  templateUrl: './day-picker.html',
  host: {
    'class': 'sm:relative',
    '(document:click)': 'closeOnOutsideClick($event)',
    '(focusout)': 'closeOnFocusOut($event)',
  },
  imports: [
    Grid,
    GridRow,
    GridCell,
    GridCellWidget,
    LucideChevronDown,
    LucideCalendar,
    LucideChevronLeft,
    LucideChevronRight,
  ],
})
export class DayPicker {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  readonly label = input.required<string>();
  /** Newest first */
  readonly days = input<PickerDay[]>([]);
  /** Instead of `days`; `YYYY-MM-DD` */
  readonly range = input<{ from: string; to: string }>();
  readonly value = input.required<string | undefined>();
  readonly other = input<string | undefined>();
  /** A button that picks no day */
  readonly noneLabel = input<string | undefined>();
  /** Like `noneLabel`, without a button for none */
  readonly placeholder = input<string | undefined>();
  /** The button's text then names it without `label` */
  readonly prefix = input('');
  readonly openAt = input<string | undefined>();
  readonly legend = input<string | undefined>();
  readonly variant = input<'default' | 'inline'>('default');
  /** From 640px; on phones the calendar is under the positioned ancestor */
  readonly align = input<'start' | 'end'>('start');
  readonly picked = output<string | null>();

  readonly weekdays: string[] = WEEKDAYS;
  readonly open = signal(false);
  readonly shownMonth = signal('');

  private readonly byKey = computed(() => new Map(this.days().map(day => [day.key, day])));
  private readonly months = computed(() => {
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
  readonly years = computed(() => [...new Set(this.months().map(month => month.slice(0, 4)))]);

  readonly valueLabel = computed(() => {
    const value = this.value();
    const day = value && this.dayOf(value);
    return day ? this.prefix() + day.label : (this.placeholder() ?? this.noneLabel() ?? '–');
  });
  readonly buttonName = computed(() =>
    (this.value() ? this.prefix() : this.placeholder()) ? this.valueLabel() : `${this.label()}: ${this.valueLabel()}`,
  );
  readonly monthTitle = computed(() => monthTitle(this.shownMonth()));
  readonly monthName = computed(() => MONTH_NAMES[Number(this.shownMonth().slice(5)) - 1] ?? '');
  readonly previousMonth = computed(() =>
    this.months()
      .filter(month => month < this.shownMonth())
      .at(-1),
  );
  readonly nextMonth = computed(() => this.months().find(month => month > this.shownMonth()));

  /** A list, so the grid is recreated per month */
  readonly calendars = computed(() => {
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

  /** Focuses the trigger, e.g. when a control beside it that had focus goes away */
  focus(): void {
    this.trigger().nativeElement.focus();
  }

  choose(key: string | null): void {
    if (key !== (this.value() ?? null)) this.picked.emit(key);
    this.close(true);
  }

  showMonth(month: string | undefined): void {
    if (month) this.shownMonth.set(month);
  }

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

  private dayOf(key: string): PickerDay | undefined {
    const range = this.range();
    if (!range) return this.byKey().get(key);
    if (key < range.from || key > range.to) return undefined;
    const [year, month, date] = key.split('-').map(Number);
    return { key, label: `${date} ${MONTH_NAMES[month - 1]} ${year}`, heat: 0 };
  }

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

function monthTitle(month: string): string {
  const [year, index] = month.split('-').map(Number);
  return `${MONTH_NAMES[index - 1]} ${year}`;
}
