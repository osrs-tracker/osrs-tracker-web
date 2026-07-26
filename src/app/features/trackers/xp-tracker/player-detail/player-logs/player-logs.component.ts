import { DecimalPipe } from '@angular/common';
import { Component, InputSignal, Signal, computed, inject, input } from '@angular/core';
import { Hiscore, MiniGame, Skill, hiscoreDiff } from '@osrs-tracker/hiscores';
import { Player } from '@osrs-tracker/models';
import { CardComponent } from 'src/app/common/components/general/card.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { CapitalizePipe } from 'src/app/common/pipes/capitalize.pipe';
import { ShortDatePipe } from 'src/app/common/pipes/date-fns.pipe';
import { XpTrackerViewType } from '../../xp-tracker-view-type';
import { XpTrackerStore } from '../../xp-tracker.store';

@Component({
  selector: 'player-logs',
  templateUrl: './player-logs.component.html',
  imports: [CapitalizePipe, CardComponent, DecimalPipe, IconDirective, ShortDatePipe],
})
export class PlayerLogsComponent {
  private readonly XpTrackerStore = inject(XpTrackerStore);

  readonly XpTrackerViewType: typeof XpTrackerViewType = XpTrackerViewType;
  readonly xpTrackerViewType = this.XpTrackerStore.viewType;

  otherKeys: (keyof Hiscore)[] = ['bountyHunter', 'clueScrolls', 'competitive', 'minigames', 'bosses', 'raids'];

  readonly playerDetail: InputSignal<Player> = input.required();

  get isPlayerTracked(): boolean {
    return !!this.playerDetail().scrapingOffsets?.length;
  }

  readonly today: InputSignal<Hiscore | undefined> = input();
  readonly history: InputSignal<Hiscore[]> = input.required();

  readonly hiscoreDiffs: Signal<Hiscore[]> = computed(() => {
    let previousHiscore = this.today() ?? this.history()[0];

    return this.history()!.map(hiscore => {
      const diff = hiscoreDiff(previousHiscore, hiscore);
      previousHiscore = hiscore;
      return diff;
    });
  });

  skills(hiscore: Hiscore): Skill[] {
    return Object.values(hiscore.skills);
  }

  hasXpDiff(hiscore: Hiscore): boolean {
    return this.skills(hiscore).some(skill => skill.xp > 0);
  }

  minigames(type: keyof Hiscore, hiscore: Hiscore): MiniGame[] {
    return Object.values(hiscore[type]);
  }

  hasMiniGameDiff(type: keyof Hiscore, hiscore: Hiscore): boolean {
    return this.minigames(type, hiscore).some(boss => boss.score > 0);
  }

  filteredOtherKeys(hiscore: Hiscore): (keyof Hiscore)[] {
    return this.otherKeys.filter(key => this.hasMiniGameDiff(key, hiscore));
  }

  setView(viewType: XpTrackerViewType): void {
    this.XpTrackerStore.setViewType(viewType);
  }
}
