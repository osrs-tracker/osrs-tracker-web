import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Hiscore } from '@osrs-tracker/hiscores';
import { IconDirective } from '../../directives/icon/icon.directive';
import { PlayerSkillWidgetComponent } from './player-skill.component';

@Component({
  standalone: true,
  selector: 'player-skills',
  template: `
    <section class="grid grid-cols-3 p-2 shadow-lg rounded-lg bg-slate-100 dark:bg-slate-800">
      <player-skill [skill]="skills?.Attack" class="border border-slate-300 dark:border-slate-600 rounded-tl-lg" />
      <player-skill [skill]="skills?.Hitpoints" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Mining" class="border border-slate-300 dark:border-slate-600 rounded-tr-lg" />
      <player-skill [skill]="skills?.Strength" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Agility" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Smithing" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Defence" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Herblore" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Fishing" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Ranged" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Thieving" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Cooking" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Prayer" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Crafting" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Firemaking" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Magic" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Fletching" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Woodcutting" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Runecraft" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Slayer" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Farming" class="border border-slate-300 dark:border-slate-600" />
      <player-skill
        [skill]="skills?.Construction"
        class="border border-slate-300 dark:border-slate-600 rounded-bl-lg"
      />
      <player-skill [skill]="skills?.Hunter" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="skills?.Overall" class="border border-slate-300 dark:border-slate-600 rounded-br-lg" />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconDirective, PlayerSkillWidgetComponent],
})
export class PlayerSkillsWidgetComponent {
  get skills(): Hiscore['skills'] | undefined {
    return this.hiscore?.skills;
  }

  @Input() hiscore?: Hiscore;
}
