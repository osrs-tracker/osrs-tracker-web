import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Player } from '@osrs-tracker/models';
import { Hiscore } from 'src/app/services/hiscores/hiscore.model';
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
    return hiscore.skills.some(skill => skill.xp > 0);
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
