import { DecimalPipe } from '@angular/common';
import { Component, InputSignal, Signal, computed, input } from '@angular/core';
import { SkillEnum, calculateXPForSkillLevel, calculateXPToNextLevel } from '@osrs-tracker/hiscores';
import { HiscoreSkill } from '@osrs-tracker/models';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { TooltipComponent } from 'src/app/common/components/general/tooltip/tooltip.component';
import { SkeletonComponent } from 'src/app/common/components/general/skeleton.component';

@Component({
  selector: 'player-skill',
  template: `
    <div
      class="flex flex-col"
      [tooltip]="skill() ? 'skillTooltip' : false"
      [tooltipTemplate]="tooltipTemplate"
      [tooltipUnderline]="false"
    >
      <div class="px-3 pt-1.5 flex items-center gap-2 hover:bg-row" [class]="hasProgressBar() ? 'pb-1' : 'pb-1.5'">
        @if (skill(); as skill) {
          @if (skill.name === SkillEnum.Overall) {
            <div class="text-center flex-1 text-lg">
              Total level: <span class="font-bold tabular-nums">{{ skill.level }}</span>
            </div>
          } @else {
            <div class="mx-auto w-full max-w-15 flex items-center gap-2">
              <div class="size-7 shrink-0 flex items-center justify-center">
                <img icon [name]="skill.name" [skill]="true" [scale]="1.5" />
              </div>
              <div class="ml-auto text-lg font-bold tabular-nums">{{ skill.level }}</div>
            </div>
          }
        } @else {
          <skeleton class="mx-auto h-5 w-20 my-1" />
        }
      </div>
      @if (hasProgressBar()) {
        <div class="w-full h-0.5 bg-row">
          <div class="bg-accent h-0.5" [style.width.%]="percentageToNextLevel"></div>
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
        <div class="text-right tabular-nums">
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
  imports: [IconDirective, TooltipComponent, DecimalPipe, SkeletonComponent],
})
export class PlayerSkillWidgetComponent {
  readonly SkillEnum: typeof SkillEnum = SkillEnum;

  readonly skill: InputSignal<HiscoreSkill | undefined> = input.required();

  readonly hasProgressBar: Signal<boolean> = computed(() => {
    const skill = this.skill();
    return !!skill && skill.name !== SkillEnum.Overall && skill.level < 99;
  });

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
