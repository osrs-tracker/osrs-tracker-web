import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { Hiscore } from 'src/app/services/hiscores/hiscore.model';

@Component({
  selector: 'player-widget',
  templateUrl: './player-widget.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerWidgetComponent {
  readonly PlayerType: typeof PlayerType = PlayerType;
  readonly PlayerStatus: typeof PlayerStatus = PlayerStatus;

  @Input() playerDetails: Player;
  @Input() today?: Hiscore;

  calculateCombatLevel(hiscore?: Hiscore): string | number {
    if (!hiscore) return '...';

    const [, attack, defence, strength, hitpoints, ranged, prayer, magic] = hiscore.skills.map(skill => skill.level);

    const base = 0.25 * (defence + hitpoints + Math.floor(prayer / 2));
    const melee = 0.325 * (attack + strength);
    const range = 0.325 * (Math.floor(ranged / 2) + ranged);
    const mage = 0.325 * (Math.floor(magic / 2) + magic);

    return Math.floor(base + Math.max(melee, range, mage));
  }
}
