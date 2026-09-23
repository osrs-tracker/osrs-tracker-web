import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, InputSignal, Signal } from '@angular/core';
import { hiscoreDiff } from '@osrs-tracker/hiscores';
import { HiscoreEntry, Player } from '@osrs-tracker/models';
import { CardComponent } from 'src/app/common/components/general/card.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { ShortDatePipe } from 'src/app/common/pipes/date-fns.pipe';
import { XpTrackerViewType } from '../../xp-tracker-view-type';
import { XpTrackerStore } from '../../xp-tracker.store';

@Component({
  selector: 'player-logs',
  templateUrl: './player-logs.component.html',
  imports: [CardComponent, DecimalPipe, IconDirective, ShortDatePipe],
})
export class PlayerLogsComponent {
  private readonly XpTrackerStore = inject(XpTrackerStore);

  readonly XpTrackerViewType: typeof XpTrackerViewType = XpTrackerViewType;
  readonly xpTrackerViewType = this.XpTrackerStore.viewType;

  readonly playerDetail: InputSignal<Player> = input.required();

  get isPlayerTracked(): boolean {
    return !!this.playerDetail().scrapingOffsets?.length;
  }

  readonly today: InputSignal<HiscoreEntry | undefined> = input();
  readonly history: InputSignal<HiscoreEntry[]> = input.required();

  readonly hiscoreDiffs: Signal<HiscoreEntry[]> = computed(() => {
    let previousHiscore = this.today() ?? this.history()[0];

    return this.history()!.map(hiscore => {
      const diff = hiscoreDiff(previousHiscore, hiscore);
      previousHiscore = hiscore;
      return diff;
    });
  });

  hasXpDiff(hiscore: HiscoreEntry): boolean {
    return hiscore.skills.some(skill => skill.xp > 0);
  }

  hasActivityDiff(hiscore: HiscoreEntry): boolean {
    return hiscore.activities.some(activity => activity.score > 0);
  }

  setView(viewType: XpTrackerViewType): void {
    this.XpTrackerStore.setViewType(viewType);
  }
}
