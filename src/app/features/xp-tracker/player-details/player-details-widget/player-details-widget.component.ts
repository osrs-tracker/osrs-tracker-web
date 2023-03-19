import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { Hiscore } from 'src/app/services/hiscores/hiscore.model';
import { XpTrackerService } from '../../xp-tracker.service';

@Component({
  selector: 'player-details-widget',
  templateUrl: './player-details-widget.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerDetailsWidgetComponent {
  readonly PlayerType: typeof PlayerType = PlayerType;
  readonly PlayerStatus: typeof PlayerStatus = PlayerStatus;

  @Input() playerDetails: Player;
  @Input() today?: Hiscore;

  get isFavorite(): boolean {
    return this.xpTrackerService.isFavoritePlayer(this.playerDetails.username);
  }

  constructor(private xpTrackerService: XpTrackerService) {}

  toggleFavorite(): void {
    this.xpTrackerService.toggleFavoritePlayer(this.playerDetails.username);
  }
}
