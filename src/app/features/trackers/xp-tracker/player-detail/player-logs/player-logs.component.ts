import { DecimalPipe } from '@angular/common';
import { Component, InputSignal, Signal, computed, inject, input } from '@angular/core';
import { Hiscore, MiniGame, Skill, hiscoreDiff } from '@osrs-tracker/hiscores';
import { Player } from '@osrs-tracker/models';
import { CardComponent } from 'src/app/common/components/general/card.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { CapitalizePipe } from 'src/app/common/pipes/capitalize.pipe';
import { ShortDatePipe } from 'src/app/common/pipes/date-fns.pipe';
import { XpTrackerStorageService } from '../../xp-tracker-storage.service';

export enum ViewType {
  Other,
  Skills,
}

@Component({
  selector: 'player-logs',
  templateUrl: './player-logs.component.html',
  imports: [CapitalizePipe, CardComponent, DecimalPipe, IconDirective, ShortDatePipe],
})
export class PlayerLogsComponent {
  private readonly xpTrackerStorageService = inject(XpTrackerStorageService);

  readonly ViewType: typeof ViewType = ViewType;
  viewType: ViewType = this.xpTrackerStorageService.getViewType();

  otherKeys: (keyof Hiscore)[] = ['bountyHunter', 'clueScrolls', 'competitive', 'miniGames', 'bosses', 'raids'];

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

  miniGames(type: keyof Hiscore, hiscore: Hiscore): MiniGame[] {
    return Object.values(hiscore[type]);
  }

  hasMiniGameDiff(type: keyof Hiscore, hiscore: Hiscore): boolean {
    return this.miniGames(type, hiscore).some(boss => boss.score > 0);
  }

  filteredOtherKeys(hiscore: Hiscore): (keyof Hiscore)[] {
    return this.otherKeys.filter(key => this.hasMiniGameDiff(key, hiscore));
  }

  setView(viewType: ViewType): void {
    this.viewType = viewType;
    this.xpTrackerStorageService.setViewType(viewType);
  }
}
