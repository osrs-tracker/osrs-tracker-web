import { Component } from '@angular/core';
import { TooltipComponent } from './tooltip.component';

/** An info icon that shows its content in a tooltip. */
@Component({
  selector: 'info-tooltip',
  template: `
    <span
      class="flex ml-1.5 text-muted cursor-help"
      tooltip
      [tooltipTemplate]="tooltipTemplate"
      [tooltipUnderline]="false"
      aria-hidden="true"
    >
      <svg
        class="size-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="11" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </span>
    <ng-template #tooltipTemplate><ng-content /></ng-template>
  `,
  host: { class: 'flex items-center' },
  imports: [TooltipComponent],
})
export class InfoTooltipComponent {}
