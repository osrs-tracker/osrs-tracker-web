import { Component, InputSignal, Signal, computed, input } from '@angular/core';
import { ActivityEnum } from '@osrs-tracker/hiscores';
import { HiscoreActivity, HiscoreEntry } from '@osrs-tracker/models';
import { PlayerActivityWidgetComponent } from './player-activity.component';

// Normal modes on the first row, their harder modes below
const RAID_LAYOUT: ActivityEnum[] = [
  ActivityEnum.ChambersOfXeric,
  ActivityEnum.TheatreOfBlood,
  ActivityEnum.TombsOfAmascut,
  ActivityEnum.ChambersOfXericChallengeMode,
  ActivityEnum.TheatreOfBloodHardMode,
  ActivityEnum.TombsOfAmascutExpertMode,
];

@Component({
  selector: 'player-raids',
  template: `
    <section class="p-2 rounded-2xl bg-card">
      <div class="overflow-hidden border rounded-xl grid grid-cols-3 gap-px border-line bg-line">
        @for (raid of raids(); track $index) {
          <player-activity class="bg-card" [activity]="raid" scoreLabel="Completed" />
        }
      </div>
    </section>
  `,
  imports: [PlayerActivityWidgetComponent],
})
export class PlayerRaidsWidgetComponent {
  readonly hiscore: InputSignal<HiscoreEntry | undefined> = input();

  /** Raids in layout order; entries are undefined while the hiscore is loading. */
  readonly raids: Signal<(HiscoreActivity | undefined)[]> = computed(() => {
    const activities = this.hiscore()?.activities;
    return RAID_LAYOUT.map(name => activities?.find(activity => activity.name === name));
  });
}
