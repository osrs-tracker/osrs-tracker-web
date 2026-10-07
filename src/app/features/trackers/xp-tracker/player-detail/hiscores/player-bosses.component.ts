import { Component, InputSignal, Signal, computed, input } from '@angular/core';
import { HiscoreActivity, HiscoreEntry } from '@osrs-tracker/models';
import { BOSSES } from '../../activity-categories';
import { PlayerActivityWidgetComponent } from './player-activity.component';

@Component({
  selector: 'player-bosses',
  template: `
    <section class="p-2 rounded-2xl bg-card">
      @if (bosses(); as bosses) {
        <div class="overflow-hidden border rounded-xl grid grid-cols-3 gap-px border-line bg-line">
          @for (boss of bosses; track boss.name) {
            <player-activity class="bg-card" [activity]="boss" scoreLabel="Kill count" />
          }
          @for (filler of fillers(); track $index) {
            <div class="bg-card"></div>
          }
        </div>
      } @else {
        <div class="overflow-hidden border rounded-xl grid grid-cols-3 gap-px border-line bg-line">
          @for (skeleton of [].constructor(6); track $index) {
            <player-activity class="bg-card" [activity]="undefined" />
          }
        </div>
      }
    </section>
  `,
  imports: [PlayerActivityWidgetComponent],
})
export class PlayerBossesWidgetComponent {
  readonly hiscore: InputSignal<HiscoreEntry | undefined> = input();

  /** All bosses in hiscores order; undefined while the hiscore is loading. */
  readonly bosses: Signal<HiscoreActivity[] | undefined> = computed(() =>
    this.hiscore()?.activities?.filter(activity => BOSSES.has(activity.name)),
  );

  /** Empty cells that complete the last row of the grid. */
  readonly fillers: Signal<unknown[]> = computed(() => Array((3 - ((this.bosses()?.length ?? 0) % 3)) % 3));
}
