import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Hiscore } from '@osrs-tracker/hiscores';
import { IconDirective } from '../../directives/icon/icon.directive';
import { PlayerSkillWidgetComponent } from './player-skill.component';

@Component({
  standalone: true,
  selector: 'player-skills',
  template: `
    <section class="grid grid-cols-3 p-2 shadow-lg rounded-lg bg-slate-100 dark:bg-slate-800">
      <player-skill
        [skill]="hiscore?.skills?.Attack"
        class="border border-slate-300 dark:border-slate-600 rounded-tl-lg"
      />

      <player-skill [skill]="hiscore?.skills?.Hitpoints" class="border border-slate-300 dark:border-slate-600" />
      <player-skill
        [skill]="hiscore?.skills?.Mining"
        class="border border-slate-300 dark:border-slate-600 rounded-tr-lg"
      />
      <player-skill [skill]="hiscore?.skills?.Strength" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="hiscore?.skills?.Agility" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="hiscore?.skills?.Smithing" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="hiscore?.skills?.Defence" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="hiscore?.skills?.Herblore" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="hiscore?.skills?.Fishing" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="hiscore?.skills?.Ranged" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="hiscore?.skills?.Thieving" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="hiscore?.skills?.Cooking" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="hiscore?.skills?.Prayer" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="hiscore?.skills?.Crafting" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="hiscore?.skills?.Firemaking" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="hiscore?.skills?.Magic" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="hiscore?.skills?.Fletching" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="hiscore?.skills?.Woodcutting" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="hiscore?.skills?.Runecraft" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="hiscore?.skills?.Slayer" class="border border-slate-300 dark:border-slate-600" />
      <player-skill [skill]="hiscore?.skills?.Farming" class="border border-slate-300 dark:border-slate-600" />
      <player-skill
        [skill]="hiscore?.skills?.Construction"
        class="border border-slate-300 dark:border-slate-600 rounded-bl-lg"
      />
      <player-skill [skill]="hiscore?.skills?.Hunter" class="border border-slate-300 dark:border-slate-600" />
      <player-skill
        [skill]="hiscore?.skills?.Overall"
        class="border border-slate-300 dark:border-slate-600 rounded-br-lg"
      />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconDirective, PlayerSkillWidgetComponent],
})
export class PlayerSkillsWidgetComponent {
  @Input() hiscore?: Hiscore;
}
