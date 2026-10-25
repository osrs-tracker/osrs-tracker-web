import { Component, input } from '@angular/core';
import { LucideClock } from '@lucide/angular';
import { Tooltip } from '@app/common/ui/tooltip/tooltip';

// Focusable and above the row's stretched link, so the tooltip opens by keyboard and touch too
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
  readonly age = input.required<string>();
}

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
