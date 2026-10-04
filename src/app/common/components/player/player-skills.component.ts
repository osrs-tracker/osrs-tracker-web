import { Component, InputSignal, computed, input } from '@angular/core';
import { SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreEntry, HiscoreSkill } from '@osrs-tracker/models';
import { PlayerSkillWidgetComponent } from './player-skill.component';

@Component({
  selector: 'player-skills',
  template: `
    <section class="p-2 shadow-lg rounded-lg bg-slate-100 dark:bg-slate-800">
      <div
        class="overflow-hidden border rounded-xl divide-y border-slate-300 dark:border-slate-600 divide-slate-300 dark:divide-slate-600"
      >
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-skill [skill]="attack()" class="rounded-tl-lg" />
          <player-skill [skill]="hitpoints()" />
          <player-skill [skill]="mining()" class="rounded-tr-lg" />
        </div>
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-skill [skill]="strength()" />
          <player-skill [skill]="agility()" />
          <player-skill [skill]="smithing()" />
        </div>
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-skill [skill]="defence()" />
          <player-skill [skill]="herblore()" />
          <player-skill [skill]="fishing()" />
        </div>
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-skill [skill]="ranged()" />
          <player-skill [skill]="thieving()" />
          <player-skill [skill]="cooking()" />
        </div>
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-skill [skill]="prayer()" />
          <player-skill [skill]="crafting()" />
          <player-skill [skill]="firemaking()" />
        </div>
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-skill [skill]="magic()" />
          <player-skill [skill]="fletching()" />
          <player-skill [skill]="woodcutting()" />
        </div>
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-skill [skill]="runecraft()" />
          <player-skill [skill]="slayer()" />
          <player-skill [skill]="farming()" />
        </div>
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-skill [skill]="construction()" class=" rounded-bl-lg" />
          <player-skill [skill]="hunter()" />
          <player-skill [skill]="sailing()" class=" rounded-br-lg" />
        </div>
        <div class="divide-x divide-slate-300 dark:divide-slate-600">
          <player-skill [skill]="overall()" class="rounded-b-lg rounded-br-lg col-span-3" />
        </div>
      </div>
    </section>
  `,
  imports: [PlayerSkillWidgetComponent],
})
export class PlayerSkillsWidgetComponent {
  readonly hiscore: InputSignal<HiscoreEntry | undefined> = input();

  readonly attack = computed(() => this.getSkill(this.hiscore(), SkillEnum.Attack));
  readonly hitpoints = computed(() => this.getSkill(this.hiscore(), SkillEnum.Hitpoints));
  readonly mining = computed(() => this.getSkill(this.hiscore(), SkillEnum.Mining));
  readonly strength = computed(() => this.getSkill(this.hiscore(), SkillEnum.Strength));
  readonly agility = computed(() => this.getSkill(this.hiscore(), SkillEnum.Agility));
  readonly smithing = computed(() => this.getSkill(this.hiscore(), SkillEnum.Smithing));
  readonly defence = computed(() => this.getSkill(this.hiscore(), SkillEnum.Defence));
  readonly herblore = computed(() => this.getSkill(this.hiscore(), SkillEnum.Herblore));
  readonly fishing = computed(() => this.getSkill(this.hiscore(), SkillEnum.Fishing));
  readonly ranged = computed(() => this.getSkill(this.hiscore(), SkillEnum.Ranged));
  readonly thieving = computed(() => this.getSkill(this.hiscore(), SkillEnum.Thieving));
  readonly cooking = computed(() => this.getSkill(this.hiscore(), SkillEnum.Cooking));
  readonly prayer = computed(() => this.getSkill(this.hiscore(), SkillEnum.Prayer));
  readonly crafting = computed(() => this.getSkill(this.hiscore(), SkillEnum.Crafting));
  readonly firemaking = computed(() => this.getSkill(this.hiscore(), SkillEnum.Firemaking));
  readonly magic = computed(() => this.getSkill(this.hiscore(), SkillEnum.Magic));
  readonly fletching = computed(() => this.getSkill(this.hiscore(), SkillEnum.Fletching));
  readonly woodcutting = computed(() => this.getSkill(this.hiscore(), SkillEnum.Woodcutting));
  readonly runecraft = computed(() => this.getSkill(this.hiscore(), SkillEnum.Runecraft));
  readonly slayer = computed(() => this.getSkill(this.hiscore(), SkillEnum.Slayer));
  readonly farming = computed(() => this.getSkill(this.hiscore(), SkillEnum.Farming));
  readonly construction = computed(() => this.getSkill(this.hiscore(), SkillEnum.Construction));
  readonly hunter = computed(() => this.getSkill(this.hiscore(), SkillEnum.Hunter));
  readonly sailing = computed(() => this.getSkill(this.hiscore(), SkillEnum.Sailing));
  readonly overall = computed(() => this.getSkill(this.hiscore(), SkillEnum.Overall));

  getSkill(hiscore: HiscoreEntry | undefined, skillName: SkillEnum): HiscoreSkill | undefined {
    return hiscore?.skills?.find(skill => skill.name === skillName);
  }
}
