import { Component } from '@angular/core';
import { TooltipComponent } from './tooltip.component';

@Component({
  selector: 'info-tooltip',
  template: `
    <div class="text-xs ml-1 h-4" tooltip [tooltipTemplate]="tooltipTemplate">?</div>
    <ng-template #tooltipTemplate><ng-content /></ng-template>
  `,
  imports: [TooltipComponent],
})
export class InfoTooltipComponent {}
