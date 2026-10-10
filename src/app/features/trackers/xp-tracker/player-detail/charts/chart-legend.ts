import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { DecimalPipe } from '@angular/common';
import {
  afterRenderEffect,
  Component,
  computed,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { Icon } from '@app/common/icon/icon';
import { ensureToolbarTabStop, toolbarTabStop } from '@app/common/ui/controls/aria-tab-stop';

export interface LegendItem {
  name: string;
  color: string;
  /** Shown after the name, e.g. the period total */
  total?: number;
  on: boolean;
}

/**
 * The chart's chips: the skill or activity icon and name in its series colour; picking one toggles its series. Past
 * `collapseAfter` items, the rest that are off wait behind a "+N" chip, so the plot keeps its room.
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
        class="flex items-center gap-1.5 h-9 pl-2 pr-3 rounded-full border font-bold transition-colors"
        [class]="item.on ? 'text-strong' : 'border-line text-muted hover:text-strong'"
        [style.border-color]="item.on ? 'color-mix(in oklch, ' + item.color + ' 55%, transparent)' : null"
        [style.background]="item.on ? 'color-mix(in oklch, ' + item.color + ' 14%, transparent)' : null"
        [attr.aria-pressed]="item.on"
        (click)="toggled.emit(item.name)"
      >
        <span class="flex items-center justify-center size-5.5 shrink-0">
          <img
            class="max-h-5.5 max-w-5.5"
            icon
            [name]="item.name"
            [skill]="kind() === 'skill'"
            [activity]="kind() === 'activity'"
          />
        </span>
        {{ item.name }}
        @if (item.total !== undefined) {
          <span class="tabular-nums">{{ prefix() }}{{ item.total | number }}</span>
        }
      </button>
    }
    @if (hidden() > 0) {
      <button
        ngToolbarWidget
        type="button"
        class="h-9 px-3 rounded-full border border-line font-bold text-muted hover:text-strong"
        [attr.aria-expanded]="expanded()"
        (click)="expanded.set(!expanded())"
      >
        {{ expanded() ? 'Fewer' : '+' + hidden() }}
      </button>
    }
  `,
  hostDirectives: [Toolbar],
  host: {
    'class': 'flex flex-wrap gap-2 text-sm',
    'aria-label': 'Chart series',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  imports: [DecimalPipe, Icon, ToolbarWidget],
})
export class ChartLegend {
  readonly items: InputSignal<LegendItem[]> = input.required();
  readonly kind: InputSignal<'skill' | 'activity'> = input.required();
  readonly prefix: InputSignal<string> = input('');
  readonly collapseAfter: InputSignal<number> = input(Infinity);

  readonly toggled: OutputEmitterRef<string> = output();

  readonly expanded: WritableSignal<boolean> = signal(false);
  /** Collapsed: the first items, and any that are on */
  readonly shown: Signal<LegendItem[]> = computed(() =>
    this.expanded() ? this.items() : this.items().filter((item, i) => i < this.collapseAfter() || item.on),
  );
  /** How many items collapsing hides; with none, there is nothing to expand or collapse */
  readonly hidden: Signal<number> = computed(
    () => this.items().filter((item, i) => i >= this.collapseAfter() && !item.on).length,
  );

  private readonly document = inject(DOCUMENT);
  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly toolbar: Toolbar = inject(Toolbar);
  /** The chip that last had focus, while focus is in the legend */
  private focusedChip?: HTMLElement;

  constructor() {
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
