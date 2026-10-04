import { Component, InputSignal, Signal, computed, input } from '@angular/core';
import { SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreEntry, HiscoreSkill } from '@osrs-tracker/models';
import { PlayerSkillWidgetComponent } from './player-skill.component';

// The in-game skill grid, read row by row, followed by the total level across the full width
const SKILL_LAYOUT: SkillEnum[] = [
  ...[SkillEnum.Attack, SkillEnum.Hitpoints, SkillEnum.Mining],
  ...[SkillEnum.Strength, SkillEnum.Agility, SkillEnum.Smithing],
  ...[SkillEnum.Defence, SkillEnum.Herblore, SkillEnum.Fishing],
  ...[SkillEnum.Ranged, SkillEnum.Thieving, SkillEnum.Cooking],
  ...[SkillEnum.Prayer, SkillEnum.Crafting, SkillEnum.Firemaking],
  ...[SkillEnum.Magic, SkillEnum.Fletching, SkillEnum.Woodcutting],
  ...[SkillEnum.Runecraft, SkillEnum.Slayer, SkillEnum.Farming],
  ...[SkillEnum.Construction, SkillEnum.Hunter, SkillEnum.Sailing],
  SkillEnum.Overall,
];

@Component({
  selector: 'player-skills',
  template: `
    <section class="p-2 shadow-lg rounded-lg bg-slate-100 dark:bg-slate-800">
      <div
        class="overflow-hidden border rounded-xl grid grid-cols-3 gap-px border-slate-300 dark:border-slate-600 bg-slate-300 dark:bg-slate-600"
      >
        @for (skill of skills(); track $index) {
          <player-skill class="bg-slate-100 dark:bg-slate-800" [class.col-span-3]="$last" [skill]="skill" />
        }
      </div>
    </section>
  `,
  imports: [PlayerSkillWidgetComponent],
})
export class PlayerSkillsWidgetComponent {
  readonly hiscore: InputSignal<HiscoreEntry | undefined> = input();

  /** Skills in layout order; entries are undefined while the hiscore is loading. */
  readonly skills: Signal<(HiscoreSkill | undefined)[]> = computed(() => {
    const skills = this.hiscore()?.skills;
    return SKILL_LAYOUT.map(name => skills?.find(skill => skill.name === name));
  });
}
