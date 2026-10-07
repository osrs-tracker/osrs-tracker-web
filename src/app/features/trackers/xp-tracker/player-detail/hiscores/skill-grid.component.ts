import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, InputSignal, Signal } from '@angular/core';
import { calculateXPForSkillLevel, SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreEntry, HiscoreSkill } from '@osrs-tracker/models';
import { SkeletonComponent } from 'src/app/common/components/general/skeleton.component';
import { TooltipComponent } from 'src/app/common/components/general/tooltip/tooltip.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { percentageToNextLevel } from '../../skill-progress';
import { PlayerView } from '../player-view';

// The in-game skill grid, read row by row; the total level follows across the full width
const SKILL_LAYOUT: SkillEnum[] = [
  ...[SkillEnum.Attack, SkillEnum.Hitpoints, SkillEnum.Mining],
  ...[SkillEnum.Strength, SkillEnum.Agility, SkillEnum.Smithing],
  ...[SkillEnum.Defence, SkillEnum.Herblore, SkillEnum.Fishing],
  ...[SkillEnum.Ranged, SkillEnum.Thieving, SkillEnum.Cooking],
  ...[SkillEnum.Prayer, SkillEnum.Crafting, SkillEnum.Firemaking],
  ...[SkillEnum.Magic, SkillEnum.Fletching, SkillEnum.Woodcutting],
  ...[SkillEnum.Runecraft, SkillEnum.Slayer, SkillEnum.Farming],
  ...[SkillEnum.Construction, SkillEnum.Hunter, SkillEnum.Sailing],
];

interface SkillCell {
  name: SkillEnum;
  skill?: HiscoreSkill;
  /** Below 99 only */
  progress?: number;
  on: boolean;
}

/** The skill levels with their progress to the next level; picking skills compares them on the chart. */
@Component({
  selector: 'skill-grid',
  template: `
    <div class="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
      @for (cell of cells(); track cell.name; let i = $index) {
        <button
          type="button"
          class="flex flex-col justify-between focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-strong"
          [class]="
            (cell.on ? 'bg-row inset-ring-2 inset-ring-accent ' : 'bg-inner ') +
            (i === 0 ? 'rounded-tl-xl' : i === 2 ? 'rounded-tr-xl' : '')
          "
          [attr.aria-pressed]="cell.on"
          [attr.aria-label]="label(cell)"
          [tooltip]="!!cell.skill"
          [tooltipTemplate]="tooltipTemplate"
          [tooltipUnderline]="false"
          (click)="playerView.toggleSkill(cell.name)"
        >
          <span class="flex items-center justify-between h-9.25 pt-1.75 pb-1.5 px-3">
            @if (cell.skill; as skill) {
              <img class="h-6 w-auto" icon [name]="cell.name" [skill]="true" />
              <span class="text-base font-bold text-strong tabular-nums">{{ skill.level }}</span>
            } @else {
              <skeleton class="mx-auto h-5 w-16" />
            }
          </span>
          <span class="block h-0.75 bg-line">
            @if (cell.progress !== undefined) {
              <span class="block h-0.75 bg-accent-hover" [style.width.%]="cell.progress"></span>
            }
          </span>
        </button>

        <ng-template #tooltipTemplate>
          <div class="flex justify-between gap-4">
            <div>
              <div>{{ cell.name }} XP:</div>
              @if (cell.progress !== undefined) {
                <div>Next level at:</div>
                <div>Remaining XP:</div>
              }
            </div>
            <div class="text-right tabular-nums">
              <div>{{ cell.skill?.xp | number }}</div>
              @if (cell.progress !== undefined) {
                <div>{{ xpForNextLevel(cell.skill!) | number }}</div>
                <div>{{ xpForNextLevel(cell.skill!) - cell.skill!.xp | number }}</div>
              }
            </div>
          </div>
          @if (cell.progress !== undefined) {
            <div class="pt-1 text-muted">
              {{ cell.progress | number: '1.0-0' }}% to level {{ cell.skill!.level + 1 }}
            </div>
          }
        </ng-template>
      }

      <button
        type="button"
        class="col-span-3 flex items-center justify-center gap-2 h-11 rounded-b-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-strong"
        [class]="overallOn() ? 'bg-row inset-ring-2 inset-ring-accent' : 'bg-inner'"
        [attr.aria-pressed]="overallOn()"
        (click)="playerView.toggleSkill(SkillEnum.Overall)"
      >
        @if (overall(); as overall) {
          <img class="h-5.5 w-auto" icon [name]="SkillEnum.Overall" [skill]="true" />
          <span>Total level:</span>
          <span class="text-base font-bold text-strong tabular-nums">{{ overall.level | number }}</span>
        } @else {
          <skeleton class="h-5 w-32" />
        }
      </button>
    </div>
  `,
  imports: [DecimalPipe, IconDirective, SkeletonComponent, TooltipComponent],
})
export class SkillGridComponent {
  readonly playerView = inject(PlayerView);

  readonly SkillEnum: typeof SkillEnum = SkillEnum;

  /** Undefined while the hiscores load */
  readonly hiscore: InputSignal<HiscoreEntry | undefined> = input.required();

  readonly cells: Signal<SkillCell[]> = computed(() => {
    const selected = this.playerView.skills();
    return SKILL_LAYOUT.map(name => {
      const skill = this.hiscore()?.skills.find(s => s.name === name);
      return {
        name,
        skill,
        progress: skill && skill.level < 99 ? percentageToNextLevel(skill.xp, skill.level) : undefined,
        on: selected.has(name),
      };
    });
  });
  readonly overall: Signal<HiscoreSkill | undefined> = computed(() =>
    this.hiscore()?.skills.find(s => s.name === SkillEnum.Overall),
  );
  readonly overallOn: Signal<boolean> = computed(() => this.playerView.skills().has(SkillEnum.Overall));

  xpForNextLevel(skill: HiscoreSkill): number {
    return calculateXPForSkillLevel(skill.level + 1);
  }

  label(cell: SkillCell): string {
    if (!cell.skill) return cell.name;
    const progress = cell.progress === undefined ? '' : `, ${Math.floor(cell.progress)}% to ${cell.skill.level + 1}`;
    return `${cell.name} level ${cell.skill.level}${progress}`;
  }
}
