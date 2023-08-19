import { DecimalPipe, NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Hiscore, MiniGame, Skill, hiscoreDiff } from '@osrs-tracker/hiscores';
import { Player } from '@osrs-tracker/models';
import { CardComponent } from 'src/app/common/components/card.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { CapitalizePipe } from 'src/app/common/pipes/capitalize.pipe';
import { ShortDatePipe } from 'src/app/common/pipes/date-fns.pipe';
import { XpTrackerService } from '../../xp-tracker.service';

export enum ViewType {
  Other,
  Skills,
}

@Component({
  standalone: true,
  selector: 'player-logs',
  templateUrl: './player-logs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, NgFor, NgTemplateOutlet, CapitalizePipe, CardComponent, DecimalPipe, IconDirective, ShortDatePipe],
})
export class PlayerLogsComponent implements OnChanges {
  readonly ViewType: typeof ViewType = ViewType;
  viewType: ViewType = this.xpTrackerService.getViewType();

  hiscoreDiffs: Hiscore[];

  otherKeys: (keyof Hiscore)[] = ['bountyHunter', 'clueScrolls', 'competitive', 'miniGames', 'bosses', 'raids'];

  @Input() playerDetail: Player;

  @Input() today?: Hiscore;
  @Input() history?: Hiscore[];

  get isPlayerTracked(): boolean {
    return !!this.playerDetail.scrapingOffsets?.length;
  }

  constructor(private xpTrackerService: XpTrackerService) {}

  ngOnChanges({ history }: SimpleChanges): void {
    if (history?.currentValue) this.calculateHiscoreDiffs();
  }

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
    this.xpTrackerService.setViewType(viewType);
  }

  private calculateHiscoreDiffs(): void {
    let previousHiscore = this.today;

    this.hiscoreDiffs = this.history!.map(hiscore => {
      const diff = hiscoreDiff(previousHiscore!, hiscore);
      previousHiscore = hiscore;
      return diff;
    });
  }
}
