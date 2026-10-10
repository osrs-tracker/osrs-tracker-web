import { booleanAttribute, Component, input, InputSignal, InputSignalWithTransform } from '@angular/core';
import { InfoTooltip } from './tooltip/info-tooltip';
import { Skeleton } from './skeleton';

/**
 * A labelled value with a line below it, e.g. "XP last 7 days · 3.72M · +24% vs previous week". `tone` colours the line
 * for a change; `compact` (24px value instead of 30px) fits six in a row; `loading` shows skeletons of the same size.
 */
@Component({
  selector: 'stat-tile',
  template: `
    @if (loading()) {
      <div class="flex flex-col gap-1" aria-hidden="true">
        <div class="flex items-center h-5"><skeleton class="h-3 w-22" /></div>
        <div class="flex items-center" [class]="compact() ? 'h-7.5' : 'h-8.5'">
          <skeleton class="rounded-lg" [class]="compact() ? 'h-5.5 w-26' : 'h-6.5 w-30'" />
        </div>
        <div class="flex items-center h-4.5"><skeleton class="h-3 w-32" /></div>
      </div>
    } @else {
      <span class="flex items-center h-5 text-sm text-muted">
        <span class="truncate">{{ label() }}</span>
        @if (info()) {
          <info-tooltip>{{ info() }}</info-tooltip>
        }
      </span>
      <span
        class="font-bold text-strong tabular-nums truncate"
        [class]="compact() ? 'text-2xl/7.5' : 'text-3xl/8.5'"
        [attr.title]="tip() || null"
        >{{ value() }}</span
      >
      @if (sub()) {
        <span
          class="text-sm/4.5 truncate"
          [class]="tone() === 'up' ? 'font-bold text-up' : tone() === 'down' ? 'font-bold text-down' : 'text-muted'"
          >{{ sub() }}</span
        >
      }
    }
  `,
  host: {
    'class': 'flex flex-col gap-1 min-w-0 px-4.5 py-4 rounded-2xl bg-card',
    '[attr.aria-busy]': 'loading()',
  },
  imports: [InfoTooltip, Skeleton],
})
export class StatTile {
  readonly label: InputSignal<string> = input('');
  readonly value: InputSignal<string> = input('');
  readonly sub: InputSignal<string> = input('');
  readonly tone: InputSignal<'muted' | 'up' | 'down'> = input<'muted' | 'up' | 'down'>('muted');
  /** Explains the label, in an info tooltip */
  readonly info: InputSignal<string> = input('');
  /** Shown on hover over the value, e.g. the exact number behind a short one */
  readonly tip: InputSignal<string> = input('');
  readonly compact: InputSignalWithTransform<boolean, unknown> = input(false, { transform: booleanAttribute });
  readonly loading: InputSignalWithTransform<boolean, unknown> = input(false, { transform: booleanAttribute });
}
