import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Player } from '@osrs-tracker/models';
import { Hiscore, Skill } from 'src/app/services/hiscores/hiscore.model';
import { HiscoreService } from 'src/app/services/hiscores/hiscore.service';

@Component({
  selector: 'player-logs',
  templateUrl: './player-logs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerLogsComponent implements OnChanges {
  @Input() playerDetails: Player;

  @Input() today: Hiscore | null;
  @Input() history: Hiscore[] | null;

  hiscoreDiffs: Hiscore[];

  get isPlayerTracked(): boolean {
    return !!this.playerDetails.scrapingOffsets?.length;
  }

  constructor(private hiscoreService: HiscoreService) {}

  ngOnChanges({ history }: SimpleChanges): void {
    if (history?.currentValue.length) {
      this.calculateHiscoreDiffs();
    }
  }

  hasXpGained(hiscore: Hiscore): boolean {
    return this.skills(hiscore).some(skill => skill.xp > 0);
  }

  skills(hiscore: Hiscore): Skill[] {
    return Object.values(hiscore.skills);
  }

  private calculateHiscoreDiffs(): void {
    if (!this.today || !this.history) return;

    let previousHiscore = this.today;

    this.hiscoreDiffs = this.history.map(hiscore => {
      const diff = this.hiscoreService.hiscoreDiff(previousHiscore, hiscore);
      previousHiscore = hiscore;
      return diff;
    });
  }
}
