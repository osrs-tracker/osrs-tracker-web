import { DatePipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { CapitalizePipe } from 'src/app/common/pipes/capitalize.pipe';
import { GoogleAnalyticsService } from 'src/app/common/services/google-analytics.service';
import { Hiscore } from 'src/app/common/services/hiscores/hiscore.model';
import { XpTrackerService } from '../../xp-tracker.service';

@Component({
  standalone: true,
  selector: 'player-detail-widget',
  templateUrl: './player-detail-widget.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, CapitalizePipe, DatePipe, IconDirective],
})
export class PlayerDetailWidgetComponent {
  readonly PlayerType: typeof PlayerType = PlayerType;
  readonly PlayerStatus: typeof PlayerStatus = PlayerStatus;

  @Input() playerDetail: Player;
  @Input() today?: Hiscore;

  get isFavorite(): boolean {
    return this.xpTrackerService.isFavoritePlayer(this.playerDetail.username);
  }

  constructor(private googlAnalyticsService: GoogleAnalyticsService, private xpTrackerService: XpTrackerService) {}

  toggleFavorite(): void {
    this.xpTrackerService.toggleFavoritePlayer(this.playerDetail.username);

    this.googlAnalyticsService.trackEvent(
      'toggle_favorite_player',
      'xp_tracker',
      this.playerDetail.username,
      this.isFavorite,
    );
  }
}
