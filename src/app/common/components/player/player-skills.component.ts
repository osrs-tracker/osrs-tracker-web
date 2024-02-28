import { ChangeDetectionStrategy, Component, InputSignal, Signal, computed, input } from '@angular/core';
import { Hiscore } from '@osrs-tracker/hiscores';
import { IconDirective } from '../../directives/icon/icon.directive';
import { PlayerSkillWidgetComponent } from './player-skill.component';

@Component({
  standalone: true,
  selector: 'player-skills',
  template: `
    <section class="p-2 shadow-lg rounded-lg bg-slate-100 dark:bg-slate-800">
      <div
        class="overflow-hidden border rounded-xl divide-y border-slate-300 dark:border-slate-600 divide-slate-300 dark:divide-slate-600"
      >
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-skill [skill]="skills()?.Attack" class="rounded-tl-lg" />
          <player-skill [skill]="skills()?.Hitpoints" />
          <player-skill [skill]="skills()?.Mining" class="rounded-tr-lg" />
        </div>
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-skill [skill]="skills()?.Strength" />
          <player-skill [skill]="skills()?.Agility" />
          <player-skill [skill]="skills()?.Smithing" />
        </div>
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-skill [skill]="skills()?.Defence" />
          <player-skill [skill]="skills()?.Herblore" />
          <player-skill [skill]="skills()?.Fishing" />
        </div>
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-skill [skill]="skills()?.Ranged" />
          <player-skill [skill]="skills()?.Thieving" />
          <player-skill [skill]="skills()?.Cooking" />
        </div>
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-skill [skill]="skills()?.Prayer" />
          <player-skill [skill]="skills()?.Crafting" />
          <player-skill [skill]="skills()?.Firemaking" />
        </div>
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-skill [skill]="skills()?.Magic" />
          <player-skill [skill]="skills()?.Fletching" />
          <player-skill [skill]="skills()?.Woodcutting" />
        </div>
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-skill [skill]="skills()?.Runecraft" />
          <player-skill [skill]="skills()?.Slayer" />
          <player-skill [skill]="skills()?.Farming" />
        </div>
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-skill [skill]="skills()?.Construction" class=" rounded-bl-lg" />
          <player-skill [skill]="skills()?.Hunter" />
          <player-skill [skill]="skills()?.Overall" class=" rounded-br-lg" />
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconDirective, PlayerSkillWidgetComponent],
})
export class PlayerSkillsWidgetComponent {
  hiscore: InputSignal<Hiscore | undefined> = input();
  skills: Signal<Hiscore['skills'] | undefined> = computed(() => this.hiscore()?.skills);
}
