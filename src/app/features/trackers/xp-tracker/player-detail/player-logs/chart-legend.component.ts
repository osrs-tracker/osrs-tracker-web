import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';

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
  host: { 'class': 'flex flex-wrap gap-2 text-sm', 'aria-label': 'Chart series' },
  imports: [DecimalPipe, IconDirective, ToolbarWidget],
})
export class ChartLegendComponent {
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

  private readonly toolbar: Toolbar = inject(Toolbar);

  constructor() {
    // The toolbar makes its first chip the Tab stop in an afterRenderEffect, which never runs on the server, and keeps a
    // chip that's gone (toggled off behind "+N", or a period without it) as the Tab stop, leaving none. As an effect,
    // this also runs during SSR. Uses the toolbar's pattern: aria has no public API for it yet (see docs/decisions.md).
    effect(() => {
      const pattern = this.toolbar._pattern;
      const active = pattern.activeItem();
      if (!active || !pattern.inputs.items().includes(active)) pattern.setDefaultState();
    });
  }
}
