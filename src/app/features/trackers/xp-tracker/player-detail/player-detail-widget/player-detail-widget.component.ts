import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { Hiscore } from 'src/app/services/hiscores/hiscore.model';
import { XpTrackerService } from '../../xp-tracker.service';

@Component({
  selector: 'player-detail-widget',
  templateUrl: './player-detail-widget.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerDetailWidgetComponent {
  readonly PlayerType: typeof PlayerType = PlayerType;
  readonly PlayerStatus: typeof PlayerStatus = PlayerStatus;

  @Input() playerDetail: Player;
  @Input() today?: Hiscore;

  get isFavorite(): boolean {
    return this.xpTrackerService.isFavoritePlayer(this.playerDetail.username);
  }

  constructor(private xpTrackerService: XpTrackerService) {}

  toggleFavorite(): void {
    this.xpTrackerService.toggleFavoritePlayer(this.playerDetail.username);
  }
}