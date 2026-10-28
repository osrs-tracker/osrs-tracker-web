import { booleanAttribute, Component, computed, input, TemplateRef } from '@angular/core';
import { InfoTooltip } from '../tooltip/info-tooltip';
import { Tooltip } from '../tooltip/tooltip';
import { Skeleton } from '../loading/skeleton';

/** `subTip` shows a line that may be cut off in full; without it, the line's `title` does. */
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
          <info-tooltip [label]="'About ' + label()"
            ><ng-template>{{ info() }}</ng-template></info-tooltip
          >
        }
      </span>
      @if (valueTip(); as valueTip) {
        <span
          class="font-bold tabular-nums truncate cursor-help decoration-dotted underline-offset-6 hover:underline pointer-coarse:underline"
          [class]="valueClass()"
          [style.--digits]="compact() ? digits() : null"
          tabindex="0"
          [tooltip]="true"
          [tooltipTemplate]="valueTip"
          [tooltipUnderline]="false"
          >{{ value() }}</span
        >
      } @else {
        <span
          class="font-bold tabular-nums truncate"
          [class]="valueClass()"
          [style.--digits]="compact() ? digits() : null"
          [attr.title]="tip() || null"
          >{{ value() }}</span
        >
      }
      @if (sub()) {
        <span
          class="text-sm/4.5 truncate"
          [class]="tone() === 'up' ? 'font-bold text-up' : tone() === 'down' ? 'font-bold text-down' : 'text-muted'"
          [tooltip]="!!subTip()"
          [tooltipTemplate]="subTipTemplate"
          [tooltipUnderline]="false"
          [attr.tabindex]="subTip() ? 0 : null"
          [attr.title]="subTip() ? null : sub()"
          >{{ sub() }}</span
        >
        <ng-template #subTipTemplate
          ><span class="whitespace-pre-line">{{ subTip() }}</span></ng-template
        >
      }
      <ng-content />
    }
  `,
  host: {
    'class': 'flex flex-col gap-1 min-w-0 p-4 rounded-2xl bg-card',
    '[attr.aria-busy]': 'loading()',
    '[style.container-type]': "compact() ? 'inline-size' : null",
  },
  imports: [InfoTooltip, Skeleton, Tooltip],
})
export class StatTile {
  readonly label = input('');
  readonly value = input('');
  readonly sub = input('');
  readonly tone = input<'muted' | 'up' | 'down'>('muted');
  /** For a value that's a gain or a loss in itself, such as a margin */
  readonly valueTone = input<'up' | 'down' | undefined>();
  /** How the value adds up, as a tooltip in place of `tip` */
  readonly valueTip = input<TemplateRef<unknown>>();
  protected readonly valueClass = computed(
    () =>
      (this.compact() ? 'fit-tile-digits leading-7.5 ' : 'text-3xl/8.5 ') +
      (this.valueTone() === 'up' ? 'text-up' : this.valueTone() === 'down' ? 'text-down' : 'text-strong'),
  );
  readonly info = input('');
  readonly tip = input('');
  /** `\n` starts a new line */
  readonly subTip = input('');
  readonly compact = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });

  /** What `fit-tile-digits` sizes by: digits and unit letters (672.87M is 6) */
  protected readonly digits = computed(() => Math.max(1, this.value().replace(/[^\dA-Z]/g, '').length));
}
