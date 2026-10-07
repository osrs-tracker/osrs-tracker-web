import { Component, InputSignal, computed, input } from '@angular/core';
import { ActivityEnum } from '@osrs-tracker/hiscores';
import { HiscoreActivity, HiscoreEntry } from '@osrs-tracker/models';
import { PlayerActivityWidgetComponent } from './player-activity.component';

@Component({
  selector: 'player-clues',
  template: `
    <section class="p-2 rounded-2xl bg-card">
      <div class="overflow-hidden border rounded-xl divide-y border-line divide-line">
        <div class="grid grid-cols-3 divide-x divide-line">
          <player-activity [activity]="beginner()" scoreLabel="Completed" />
          <player-activity [activity]="easy()" scoreLabel="Completed" />
          <player-activity [activity]="medium()" scoreLabel="Completed" />
        </div>
        <div class="grid grid-cols-3 divide-x divide-line">
          <player-activity [activity]="hard()" scoreLabel="Completed" />
          <player-activity [activity]="elite()" scoreLabel="Completed" />
          <player-activity [activity]="master()" scoreLabel="Completed" />
        </div>
        <player-activity [activity]="all()" scoreLabel="Completed" totalLabel="Total clues" />
      </div>
    </section>
  `,
  imports: [PlayerActivityWidgetComponent],
})
export class PlayerCluesWidgetComponent {
  readonly hiscore: InputSignal<HiscoreEntry | undefined> = input();

  readonly beginner = computed(() => this.getClue(this.hiscore(), ActivityEnum.ClueScrollsBeginner));
  readonly easy = computed(() => this.getClue(this.hiscore(), ActivityEnum.ClueScrollsEasy));
  readonly medium = computed(() => this.getClue(this.hiscore(), ActivityEnum.ClueScrollsMedium));
  readonly hard = computed(() => this.getClue(this.hiscore(), ActivityEnum.ClueScrollsHard));
  readonly elite = computed(() => this.getClue(this.hiscore(), ActivityEnum.ClueScrollsElite));
  readonly master = computed(() => this.getClue(this.hiscore(), ActivityEnum.ClueScrollsMaster));
  readonly all = computed(() => this.getClue(this.hiscore(), ActivityEnum.ClueScrollsAll));

  getClue(hiscore: HiscoreEntry | undefined, clueName: ActivityEnum): HiscoreActivity | undefined {
    return hiscore?.activities?.find(activity => activity.name === clueName);
  }
}
