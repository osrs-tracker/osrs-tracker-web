import { Component, InputSignal, computed, input } from '@angular/core';
import { ActivityEnum } from '@osrs-tracker/hiscores';
import { HiscoreActivity, HiscoreEntry } from '@osrs-tracker/models';
import { PlayerActivityWidgetComponent } from './player-activity.component';

export const RAIDS: ReadonlySet<string> = new Set([
  ActivityEnum.ChambersOfXeric,
  ActivityEnum.ChambersOfXericChallengeMode,
  ActivityEnum.TheatreOfBlood,
  ActivityEnum.TheatreOfBloodHardMode,
  ActivityEnum.TombsOfAmascut,
  ActivityEnum.TombsOfAmascutExpertMode,
]);

@Component({
  selector: 'player-raids',
  template: `
    <section class="p-2 shadow-lg rounded-lg bg-slate-100 dark:bg-slate-800">
      <div
        class="overflow-hidden border rounded-xl divide-y border-slate-300 dark:border-slate-600 divide-slate-300 dark:divide-slate-600"
      >
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-activity [activity]="chambersOfXeric()" scoreLabel="Completed" />
          <player-activity [activity]="theatreOfBlood()" scoreLabel="Completed" />
          <player-activity [activity]="tombsOfAmascut()" scoreLabel="Completed" />
        </div>
        <div class="grid grid-cols-3 divide-x divide-slate-300 dark:divide-slate-600">
          <player-activity [activity]="chambersOfXericChallengeMode()" scoreLabel="Completed" />
          <player-activity [activity]="theatreOfBloodHardMode()" scoreLabel="Completed" />
          <player-activity [activity]="tombsOfAmascutExpertMode()" scoreLabel="Completed" />
        </div>
      </div>
    </section>
  `,
  imports: [PlayerActivityWidgetComponent],
})
export class PlayerRaidsWidgetComponent {
  readonly hiscore: InputSignal<HiscoreEntry | undefined> = input();

  readonly chambersOfXeric = computed(() => this.getRaid(this.hiscore(), ActivityEnum.ChambersOfXeric));
  readonly chambersOfXericChallengeMode = computed(() =>
    this.getRaid(this.hiscore(), ActivityEnum.ChambersOfXericChallengeMode),
  );
  readonly theatreOfBlood = computed(() => this.getRaid(this.hiscore(), ActivityEnum.TheatreOfBlood));
  readonly theatreOfBloodHardMode = computed(() => this.getRaid(this.hiscore(), ActivityEnum.TheatreOfBloodHardMode));
  readonly tombsOfAmascut = computed(() => this.getRaid(this.hiscore(), ActivityEnum.TombsOfAmascut));
  readonly tombsOfAmascutExpertMode = computed(() =>
    this.getRaid(this.hiscore(), ActivityEnum.TombsOfAmascutExpertMode),
  );

  getRaid(hiscore: HiscoreEntry | undefined, raidName: ActivityEnum): HiscoreActivity | undefined {
    return hiscore?.activities?.find(activity => activity.name === raidName);
  }
}
