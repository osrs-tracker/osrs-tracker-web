import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TooltipComponent } from './tooltip.component';

@Component({
  standalone: true,
  selector: 'info-tooltip',
  template: `
    <div
      class="text-xs ml-1 h-4"
      tooltip
      [tooltipTemplate]="tooltipTemplate"
    >
      ?
    </div>
    <ng-template #tooltipTemplate><ng-content></ng-content></ng-template>
  `,
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TooltipComponent],
})
export class InfoTooltipComponent {}
