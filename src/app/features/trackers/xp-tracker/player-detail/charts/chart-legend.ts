import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from '@app/common/icon/icon';
import { ensureToolbarTabStop, toolbarTabStop } from '@app/common/ui/controls/aria-tab-stop';

export interface LegendItem {
  name: string;
  color: string;
  total?: number;
  on: boolean;
}

/** The gap between chips, `gap-2` */
const GAP = 8;

/**
 * One row of chips: those that don't fit wait behind a "+N" chip, the ones that are on first in line for the room.
 * Expanding it wraps every chip onto as many rows as they need, and the card grows to fit them. Before the chips are
 * measured (on the server, and in tests without layout), past `collapseAfter` the ones that are off wait instead.
 *
 * An `@angular/aria` toolbar: one Tab stop, the arrow keys move between the chips and the "+N" chip last, Enter or Space
 * toggles one.
 */
@Component({
  selector: 'chart-legend',
  template: `
    @for (item of shown(); track item.name) {
      <button
        ngToolbarWidget
        type="button"
        class="flex shrink-0 items-center gap-1.5 h-9 pl-2 pr-3 rounded-full border font-bold whitespace-nowrap transition-colors"
        [class]="item.on ? 'text-strong' : 'border-line text-muted hover:text-strong'"
        [style.border-color]="item.on ? 'color-mix(in oklch, ' + item.color + ' 55%, transparent)' : null"
        [style.background]="item.on ? 'color-mix(in oklch, ' + item.color + ' 14%, transparent)' : null"
        [attr.aria-pressed]="item.on"
        (click)="toggled.emit(item.name)"
      >
        <ng-container *ngTemplateOutlet="chipContent; context: { $implicit: item }" />
      </button>
    }
    @if (hidden() > 0) {
      <button
        ngToolbarWidget
        type="button"
        class="shrink-0 h-9 px-3 rounded-full border border-line font-bold text-muted whitespace-nowrap hover:text-strong"
        [attr.aria-expanded]="expanded()"
        (click)="expanded.set(!expanded())"
      >
        {{ expanded() ? 'Fewer' : '+' + hidden() }}
      </button>
    }

    <!-- Every chip once more, out of sight, to measure which fit on the row -->
    <div
      #measure
      class="absolute top-0 left-0 invisible flex gap-2 whitespace-nowrap pointer-events-none"
      aria-hidden="true"
    >
      @for (item of items(); track item.name) {
        <span class="flex shrink-0 items-center gap-1.5 h-9 pl-2 pr-3 border font-bold" [attr.data-name]="item.name">
          <ng-container *ngTemplateOutlet="chipContent; context: { $implicit: item }" />
        </span>
      }
      <span class="shrink-0 h-9 px-3 border font-bold" data-more>+{{ items().length }}</span>
    </div>

    <ng-template #chipContent let-item>
      <span class="flex items-center justify-center size-5.5 shrink-0">
        <img
          class="max-h-5.5 max-w-5.5"
          icon
          alt=""
          [name]="item.name"
          [skill]="kind() === 'skill'"
          [activity]="kind() === 'activity'"
        />
      </span>
      {{ item.name }}
      @if (item.total !== undefined) {
        <span class="tabular-nums">{{ prefix() }}{{ item.total | number }}</span>
      }
    </ng-template>
  `,
  hostDirectives: [Toolbar],
  host: {
    // The row clips sideways only, so it never wraps, also before measuring; its 4px margin keeps the focus ring in
    'class': 'relative flex gap-2 -mx-1 px-1 text-sm',
    '[class.flex-wrap]': 'expanded()',
    '[class.overflow-x-clip]': '!expanded()',
    'aria-label': 'Chart series',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  imports: [DecimalPipe, Icon, NgTemplateOutlet, ToolbarWidget],
})
export class ChartLegend {
  readonly items = input.required<LegendItem[]>();
  readonly kind = input.required<'skill' | 'activity'>();
  readonly prefix = input('');
  readonly collapseAfter = input(Infinity);

  readonly toggled = output<string>();

  readonly expanded = signal(false);
  /** The row's width and each chip's, once measured in the browser */
  private readonly rowWidth = signal(0);
  private readonly chipWidths = signal<ReadonlyMap<string, number>>(new Map());
  private readonly moreWidth = signal(0);

  private readonly collapsed = computed(() => {
    const items = this.items();
    const capped = items.filter((item, i) => i < this.collapseAfter() || item.on);
    const rowWidth = this.rowWidth();
    const widths = this.chipWidths();
    if (!rowWidth || capped.some(item => !widths.has(item.name))) return capped;

    const kept = new Set<string>();
    let used = 0;
    const fits = (item: LegendItem): boolean => {
      const width = widths.get(item.name)! + (kept.size ? GAP : 0);
      // room for "+N" unless this is the last chip left out
      const more = items.length - kept.size - 1 > 0 ? GAP + this.moreWidth() : 0;
      if (used + width + more > rowWidth) return false;
      kept.add(item.name);
      used += width;
      return true;
    };
    capped.filter(item => item.on).forEach(fits);
    for (const item of capped) if (!item.on && !fits(item)) break;
    return items.filter(item => kept.has(item.name));
  });
  readonly shown = computed(() => (this.expanded() ? this.items() : this.collapsed()));
  readonly hidden = computed(() => this.items().length - this.collapsed().length);

  private readonly document = inject(DOCUMENT);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly toolbar = inject(Toolbar);
  private readonly measure = viewChild.required<ElementRef<HTMLElement>>('measure');
  private focusedChip?: HTMLElement;

  constructor() {
    const destroyRef = inject(DestroyRef);
    // The measuring row resizes when the chips change (another period, the font loading), the legend with the card
    afterNextRender(() => {
      const host = this.elementRef.nativeElement;
      const measure = this.measure().nativeElement;
      const observer = new ResizeObserver(() => {
        // the content box: the padding is the focus ring's room
        this.rowWidth.set(host.clientWidth - 2 * 4);
        const widths = new Map<string, number>();
        for (const chip of measure.querySelectorAll<HTMLElement>('[data-name]')) {
          widths.set(chip.dataset['name']!, chip.getBoundingClientRect().width);
        }
        this.chipWidths.set(widths);
        this.moreWidth.set(measure.querySelector('[data-more]')!.getBoundingClientRect().width);
      });
      observer.observe(host);
      observer.observe(measure);
      destroyRef.onDestroy(() => observer.disconnect());
    });

    // The toolbar makes its first chip the Tab stop in an afterRenderEffect, which never runs on the server, and keeps a
    // chip that's gone (toggled off behind "+N", or a period without it) as the Tab stop, leaving none. As an effect,
    // this also runs during SSR.
    effect(() => ensureToolbarTabStop(this.toolbar));

    // When the focused chip is gone (toggled off behind "+N", or collapsed by "Fewer"), focus would fall back to the
    // page: it moves to the legend's new Tab stop instead
    afterRenderEffect(() => {
      this.shown();
      const tabStop = toolbarTabStop(this.toolbar);
      if (!this.focusedChip || this.focusedChip.isConnected || this.document.activeElement !== this.document.body)
        return;
      this.focusedChip = tabStop;
      tabStop?.focus();
    });
  }

  protected onFocusIn(event: FocusEvent): void {
    this.focusedChip = event.target as HTMLElement;
  }

  /** Focus leaving for somewhere else; a removed chip's focusout has no `relatedTarget`, so it doesn't count */
  protected onFocusOut(event: FocusEvent): void {
    const to = event.relatedTarget as Node | null;
    if (to && !this.elementRef.nativeElement.contains(to)) this.focusedChip = undefined;
  }
}
