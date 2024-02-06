import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Skill } from '@osrs-tracker/hiscores';
import { IconDirective } from '../../directives/icon/icon.directive';

@Component({
  standalone: true,
  selector: 'player-skill',
  template: `
    <div class="p-2 flex gap-8 items-center justify-center">
      @if (skill) {
        <img icon [name]="skill.name" class="w-6 h-6 " />
        <div class="text-lg font-bold">{{ skill.level }}</div>
      } @else {
        <div class="animate-pulse h-5 w-20 my-1 rounded-xl bg-slate-300 dark:bg-slate-700"></div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconDirective],
})
export class PlayerSkillWidgetComponent {
  @Input() skill?: Skill;
}
