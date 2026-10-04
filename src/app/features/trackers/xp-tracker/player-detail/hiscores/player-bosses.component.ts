import { Component, InputSignal, Signal, computed, input } from '@angular/core';
import { ActivityEnum } from '@osrs-tracker/hiscores';
import { HiscoreActivity, HiscoreEntry } from '@osrs-tracker/models';
import { PlayerActivityWidgetComponent } from './player-activity.component';
import { RAIDS } from './player-raids.component';

// Every activity from Chambers of Xeric onwards is a boss (bosses and boss-like minigames such as Wintertodt),
// except the raids, which have their own card.
const ACTIVITIES = Object.values(ActivityEnum);
const BOSSES: ReadonlySet<string> = new Set(
  ACTIVITIES.slice(ACTIVITIES.indexOf(ActivityEnum.ChambersOfXeric)).filter(activity => !RAIDS.has(activity)),
);

@Component({
  selector: 'player-bosses',
  template: `
    <section class="p-2 shadow-lg rounded-lg bg-slate-200 dark:bg-slate-800">
      @if (bosses(); as bosses) {
        <div
          class="overflow-hidden border rounded-xl grid grid-cols-3 gap-px border-slate-350 dark:border-slate-600 bg-slate-350 dark:bg-slate-600"
        >
          @for (boss of bosses; track boss.name) {
            <player-activity class="bg-slate-200 dark:bg-slate-800" [activity]="boss" scoreLabel="Kill count" />
          }
          @for (filler of fillers(); track $index) {
            <div class="bg-slate-200 dark:bg-slate-800"></div>
          }
        </div>
      } @else {
        <div
          class="overflow-hidden border rounded-xl grid grid-cols-3 gap-px border-slate-350 dark:border-slate-600 bg-slate-350 dark:bg-slate-600"
        >
          @for (skeleton of [].constructor(6); track $index) {
            <player-activity class="bg-slate-200 dark:bg-slate-800" [activity]="undefined" />
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
