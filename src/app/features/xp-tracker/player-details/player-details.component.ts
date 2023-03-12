import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';

@Component({
  selector: 'player-details',
  templateUrl: './player-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerDetailsComponent {
  readonly PlayerType: typeof PlayerType = PlayerType;
  readonly PlayerStatus: typeof PlayerStatus = PlayerStatus;

  get playerDetails(): Player | null {
    return this.activatedRoute.snapshot.data['player'];
  }

  constructor(private activatedRoute: ActivatedRoute) {}
}
