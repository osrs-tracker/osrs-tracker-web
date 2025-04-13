import { DatePipe } from '@angular/common';
import { Component, InputSignal, inject, input } from '@angular/core';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { CapitalizePipe } from 'src/app/common/pipes/capitalize.pipe';
import { AnalyticsService } from 'src/app/common/services/analytics/analytics.service';
import { XpTrackerStorageService } from '../../xp-tracker-storage.service';

@Component({
  selector: 'player-detail-widget',
  templateUrl: './player-detail-widget.component.html',
  imports: [CapitalizePipe, DatePipe, IconDirective],
})
export class PlayerDetailWidgetComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly xpTrackerStorageService = inject(XpTrackerStorageService);

  readonly PlayerType: typeof PlayerType = PlayerType;
  readonly PlayerStatus: typeof PlayerStatus = PlayerStatus;

  readonly playerDetail: InputSignal<Player> = input.required();

  get isFavorite(): boolean {
    return this.xpTrackerStorageService.isFavoritePlayer(this.playerDetail().username);
  }

  toggleFavorite(): void {
    this.xpTrackerStorageService.toggleFavoritePlayer(this.playerDetail().username);

    this.analyticsService.trackEvent(
      'toggle_favorite_player',
      'xp_tracker',
      this.playerDetail().username,
      this.isFavorite,
    );
  }
}
