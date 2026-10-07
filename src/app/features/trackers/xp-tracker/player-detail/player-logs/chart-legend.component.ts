import { DecimalPipe } from '@angular/common';
import { Component, input, InputSignal, output, OutputEmitterRef, signal, WritableSignal } from '@angular/core';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';

export interface LegendItem {
  name: string;
  color: string;
  total: number;
  hidden: boolean;
}

/** Chart legend with the skill or activity icons; clicking an item toggles its series. */
@Component({
  selector: 'chart-legend',
  template: `
    <ul class="flex flex-wrap gap-1.5 text-sm">
      @for (item of items(); track item.name; let i = $index) {
        <li [class]="!expanded() && i >= collapseAfter() ? 'hidden sm:block' : ''">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 bg-row transition-opacity"
            [class.opacity-40]="item.hidden"
            [attr.aria-pressed]="!item.hidden"
            [attr.title]="showNames() ? null : item.name"
            (click)="toggled.emit(item.name)"
          >
            <span class="size-2 shrink-0 rounded-full" [style.background-color]="item.color"></span>
            <img
              class="size-4 object-contain"
              icon
              [name]="item.name"
              [skill]="kind() === 'skill'"
              [activity]="kind() === 'activity'"
            />
            <span [class.sr-only]="!showNames()">{{ item.name }}</span>
            <span class="font-medium text-strong tabular-nums">{{ prefix() }}{{ item.total | number }}</span>
          </button>
        </li>
      }
      @if (items().length > collapseAfter()) {
        <li class="sm:hidden">
          <button
            type="button"
            class="rounded-md px-1.5 py-0.5 font-medium bg-row"
            [attr.aria-expanded]="expanded()"
            (click)="expanded.set(!expanded())"
          >
            {{ expanded() ? 'Less' : '+' + (items().length - collapseAfter()) }}
          </button>
        </li>
      }
    </ul>
  `,
  imports: [DecimalPipe, IconDirective],
})
export class ChartLegendComponent {
  readonly items: InputSignal<LegendItem[]> = input.required();
  readonly kind: InputSignal<'skill' | 'activity'> = input.required();
  readonly prefix: InputSignal<string> = input('');
  /** Off when the icons identify the items, e.g. skills */
  readonly showNames: InputSignal<boolean> = input(true);
  /** On phones, items past this one are collapsed behind a "+N" chip */
  readonly collapseAfter: InputSignal<number> = input(Infinity);

  readonly toggled: OutputEmitterRef<string> = output();

  readonly expanded: WritableSignal<boolean> = signal(false);
}
