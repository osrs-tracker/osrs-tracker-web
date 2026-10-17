import { Component } from '@angular/core';
import { Tooltip } from './tooltip';
import { LucideInfo } from '@lucide/angular';

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
      <svg lucideInfo class="size-3.5" strokeWidth="2.5" />
    </span>
    <ng-template #tooltipTemplate><ng-content /></ng-template>
  `,
  host: { class: 'flex items-center' },
  imports: [Tooltip, LucideInfo],
})
export class InfoTooltip {}
