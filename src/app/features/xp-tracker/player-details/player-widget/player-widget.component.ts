import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { SkillEnum } from 'src/app/services/hiscores/hiscore.enum';
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

  /** Split the name into an array of words and capitalize each part */
  get capitalizedUsername(): string {
    return this.playerDetails.username
      .split(/\s/g)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  calculateCombatLevel(hiscore?: Hiscore): string | number {
    if (!hiscore) return '...';

    const lvl = (skill: SkillEnum): number => hiscore.skills[skill].level;

    const base = 0.25 * (lvl(SkillEnum.Defence) + lvl(SkillEnum.Hitpoints) + Math.floor(lvl(SkillEnum.Defence) / 2));
    const melee = 0.325 * (lvl(SkillEnum.Attack) + lvl(SkillEnum.Strength));
    const range = 0.325 * (Math.floor(lvl(SkillEnum.Ranged) / 2) + lvl(SkillEnum.Ranged));
    const mage = 0.325 * (Math.floor(lvl(SkillEnum.Magic) / 2) + lvl(SkillEnum.Magic));

    return Math.floor(base + Math.max(melee, range, mage));
  }
}
