import { DecimalPipe } from '@angular/common';
import { Component, InputSignal, input } from '@angular/core';
import { Skill, SkillEnum, calculateXPForSkillLevel, calculateXPToNextLevel } from '@osrs-tracker/hiscores';
import { IconDirective } from '../../directives/icon/icon.directive';
import { TooltipComponent } from '../general/tooltip/tooltip.component';

@Component({
  selector: 'player-skill',
  template: `
    <div
      class="p-2 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700"
      tooltip
      [tooltipTemplate]="tooltipTemplate"
      [tooltipUnderline]="false"
    >
      @if (skill()) {
        <img class="flex-1 h-6" icon [name]="skill()!.name" />
        <div class="flex-1 text-lg font-bold">{{ skill()!.level }}</div>
      } @else {
        <div class="animate-pulse h-5 w-20 my-1 rounded-lg bg-slate-300 dark:bg-slate-700"></div>
      }
    </div>

    <ng-template #tooltipTemplate>
      <div class="flex justify-between gap-4">
        <div>
          <div>{{ skill()?.name }} XP:</div>
          @if (showXpDetails) {
            <div>Next Level at:</div>
            <div>Remaining XP:</div>
          }
        </div>
        <div class="text-right">
          <div>{{ skill()?.xp | number }}</div>
          @if (showXpDetails) {
            <div>{{ xpForNextLevel | number }}</div>
            <div>{{ xpToNextLevel | number }}</div>
          }
        </div>
      </div>
    </ng-template>
  `,
  imports: [IconDirective, TooltipComponent, DecimalPipe],
})
export class PlayerSkillWidgetComponent {
  readonly SkillEnum: typeof SkillEnum = SkillEnum;

  readonly skill: InputSignal<Skill | undefined> = input.required();

  get xpToNextLevel(): number {
    return calculateXPToNextLevel(this.skill()?.xp ?? 0, this.skill()?.level ?? 1);
  }

  get xpForNextLevel(): number {
    return calculateXPForSkillLevel((this.skill()?.level ?? 1) + 1);
  }

  get showXpDetails(): boolean {
    return this.skill()?.name !== SkillEnum.Overall && this.skill()?.level !== 99;
  }
}
