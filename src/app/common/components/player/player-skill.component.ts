import { DecimalPipe } from '@angular/common';
import { Component, InputSignal, Signal, computed, input } from '@angular/core';
import { Skill, SkillEnum, calculateXPForSkillLevel, calculateXPToNextLevel } from '@osrs-tracker/hiscores';
import { IconDirective } from '../../directives/icon/icon.directive';
import { TooltipComponent } from '../general/tooltip/tooltip.component';

@Component({
  selector: 'player-skill',
  template: `
    <div class="flex flex-col" [tooltip]="!!skill()" [tooltipTemplate]="tooltipTemplate" [tooltipUnderline]="false">
      <div
        class="p-2 pb-1.5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700"
        [class.pb-2]="!hasProgressBar()"
      >
        @if (skill()) {
          @if (skill()!.name === SkillEnum.Overall) {
            <div class="text-center flex-1 text-lg">
              Total level: <span class="font-bold">{{ skill()!.level }}</span>
            </div>
          } @else {
            <img class="flex-1 h-6" icon [name]="skill()!.name" />
            <div class="flex-1 text-lg font-bold">{{ skill()!.level }}</div>
          }
        } @else {
          <div class="animate-pulse h-5 w-20 my-1 rounded-lg bg-slate-300 dark:bg-slate-700"></div>
        }
      </div>
      @if (hasProgressBar()) {
        <div class="w-full h-0.5 bg-slate-300 dark:bg-slate-700">
          <div class="bg-emerald-600 dark:bg-emerald-500 h-0.5" [style.width.%]="percentageToNextLevel"></div>
        </div>
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
      @if (hasProgressBar()) {
        <div class="pt-1 text-sm text-center font-thin opacity-80">
          Progress to next level <span class="font-normal">{{ percentageToNextLevel | number: '1.0-2' }}%.</span>
        </div>
      }
    </ng-template>
  `,
  imports: [IconDirective, TooltipComponent, DecimalPipe],
})
export class PlayerSkillWidgetComponent {
  readonly SkillEnum: typeof SkillEnum = SkillEnum;

  readonly skill: InputSignal<Skill | undefined> = input.required();

  readonly hasProgressBar: Signal<boolean> = computed(
    () => (this.skill() && this.skill()!.name !== SkillEnum.Overall && this.skill()!.level < 99) || false,
  );

  get xpToNextLevel(): number {
    return calculateXPToNextLevel(this.skill()?.xp ?? 0, this.skill()?.level ?? 1);
  }

  get xpForNextLevel(): number {
    return calculateXPForSkillLevel((this.skill()?.level ?? 1) + 1);
  }

  get showXpDetails(): boolean {
    return this.skill()?.name !== SkillEnum.Overall && this.skill()?.level !== 99;
  }

  get percentageToNextLevel(): number {
    const currentXp = this.skill()?.xp ?? 0;
    const currentLevel = this.skill()?.level ?? 1;

    const xpForCurrentLevel = calculateXPForSkillLevel(currentLevel);
    const xpForNextLevel = calculateXPForSkillLevel(currentLevel + 1);

    const xpIntoLevel = currentXp - xpForCurrentLevel;
    const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;

    return Math.min(100, (xpIntoLevel / xpNeededForLevel) * 100);
  }
}
