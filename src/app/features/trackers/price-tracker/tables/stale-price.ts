import { Component, input } from '@angular/core';
import { LucideClock } from '@lucide/angular';
import { Tooltip } from '@app/common/ui/tooltip/tooltip';

/**
 * A price in a table cell that last traded a while ago: the projected price after an amber clock, the age in a
 * tooltip and for screen readers. Focusable and above the row's stretched link, so the tooltip opens by keyboard and
 * touch too. Shared by the price tables and New on the GE.
 */
@Component({
  selector: 'stale-price',
  template: `
    <span
      class="relative z-1 inline-flex items-center gap-1.5 cursor-help decoration-dotted underline-offset-6 group-hover:underline pointer-coarse:underline"
      tooltip
      [tooltipTemplate]="ageTip"
      [tooltipUnderline]="false"
      [tooltipDescribe]="false"
      tabindex="0"
    >
      <svg lucideClock class="size-3.5 text-amber" strokeWidth="2.5" />
      <ng-content />
      <span class="sr-only">, last traded {{ age() }} ago</span>
    </span>
    <ng-template #ageTip>Last traded {{ age() }} ago</ng-template>
  `,
  imports: [LucideClock, Tooltip],
})
export class StalePrice {
  /** How long ago it last traded, e.g. "3 hours" */
  readonly age = input.required<string>();
}

/** The same age as a line in a row's phone details */
@Component({
  selector: 'p[stale-note]',
  template: `
    <svg lucideClock class="size-3.5 text-amber" strokeWidth="2.5" />
    Last traded {{ age() }} ago
  `,
  host: { class: 'flex items-center gap-1.5 mt-2 text-sm text-muted' },
  imports: [LucideClock],
})
export class StaleNote {
  readonly age = input.required<string>();
}
