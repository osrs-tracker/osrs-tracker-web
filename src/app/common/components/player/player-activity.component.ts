import { DecimalPipe } from '@angular/common';
import { Component, InputSignal, input } from '@angular/core';
import { HiscoreActivity } from '@osrs-tracker/models';
import { IconDirective } from '../../directives/icon/icon.directive';
import { TooltipComponent } from '../general/tooltip/tooltip.component';

@Component({
  selector: 'player-activity',
  template: `
    <div
      class="h-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700"
      [tooltip]="!!activity()"
      [tooltipTemplate]="tooltipTemplate"
      [tooltipUnderline]="false"
    >
      @if (activity(); as activity) {
        @if (totalLabel()) {
          <div class="text-center flex-1 text-base">
            {{ totalLabel() }}: <span class="font-bold">{{ activity.score | number }}</span>
          </div>
        } @else {
          <div class="mx-auto w-full max-w-19 flex items-center gap-2">
            <div class="size-7 shrink-0 flex items-center justify-center">
              <img icon [name]="activity.name" [activity]="true" [scale]="1.5" />
            </div>
            <div class="ml-auto text-base font-bold">
              {{ activity.score > 0 ? (activity.score | number) : '-' }}
            </div>
          </div>
        }
      } @else {
        <div class="animate-pulse mx-auto h-5 w-20 my-1 rounded-lg bg-slate-300 dark:bg-slate-700"></div>
      }
    </div>

    <ng-template #tooltipTemplate>
      <div class="font-bold">{{ activity()?.name }}</div>
      <div class="flex justify-between gap-4">
        <div>
          <div>{{ scoreLabel() }}:</div>
          <div>Rank:</div>
        </div>
        <div class="text-right">
          <div>{{ (activity()?.score ?? -1) > 0 ? (activity()?.score | number) : '-' }}</div>
          <div>{{ (activity()?.rank ?? -1) > 0 ? (activity()?.rank | number) : 'Unranked' }}</div>
        </div>
      </div>
    </ng-template>
  `,
  imports: [IconDirective, TooltipComponent, DecimalPipe],
})
export class PlayerActivityWidgetComponent {
  readonly activity: InputSignal<HiscoreActivity | undefined> = input.required();
  readonly scoreLabel: InputSignal<string> = input('Score');
  /** Renders the activity as a full-width total row (e.g. "Total clues: 425") instead of icon + score. */
  readonly totalLabel: InputSignal<string | undefined> = input();
}
