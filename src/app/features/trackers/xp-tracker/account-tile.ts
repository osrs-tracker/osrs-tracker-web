import {
  Component,
  InputSignal,
  InputSignalWithTransform,
  Signal,
  booleanAttribute,
  computed,
  input,
} from '@angular/core';
import { SkillEnum } from '@osrs-tracker/hiscores';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { Icon } from '@app/common/icon/icon';
import { Tooltip } from '@app/common/ui/tooltip/tooltip';

interface AccountMode {
  label: string;
  /** What changed, e.g. "De-ironed" */
  change?: string;
  /** Which hiscores they're ranked on since */
  note?: string;
}

const TYPE_LABELS: Record<PlayerType, string> = {
  [PlayerType.Normal]: 'Regular',
  [PlayerType.Ironman]: 'Ironman',
  [PlayerType.Hardcore]: 'Hardcore ironman',
  [PlayerType.Ultimate]: 'Ultimate ironman',
};

/**
 * The player's account type as an icon tile: the helm of the type they started as, with a badge for each status they
 * lost. Bottom left a red × when de-ironed (no longer iron at all) or the ironman helm when de-ultimated (still iron);
 * bottom right a skull when a hardcore died. A tooltip, not a title, names the type and what changed.
 */
@Component({
  selector: 'account-tile',
  template: `
    @let player = account();

    <!-- a tooltip rather than a title, so the account type also shows on touch -->
    <span
      [class]="
        'relative flex items-center justify-center border border-line bg-deep ' +
        (large() ? 'size-16 rounded-2xl' : 'size-10 max-sm:size-8 rounded-xl')
      "
      [attr.tabindex]="large() ? 0 : null"
      [attr.aria-label]="modeText()"
      [tooltip]="true"
      [tooltipTemplate]="modeTooltip"
      [tooltipUnderline]="false"
    >
      @if (player.type === PlayerType.Normal) {
        @if (large()) {
          <img class="size-10" icon eager [name]="SkillEnum.Overall" [skill]="true" />
        } @else {
          <svg
            class="size-5.5 max-sm:size-4.5 stroke-text"
            viewBox="0 0 24 24"
            fill="none"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
          </svg>
        }
      } @else {
        <img [class]="large() ? 'size-10' : 'size-6 max-sm:size-5'" icon [eager]="large()" [name]="player.type" />
      }

      @if (player.status === PlayerStatus.DeIroned) {
        <span [class]="badgeClass() + ' flex items-center justify-center'">
          <svg
            [class]="large() ? 'size-4 stroke-down' : 'size-3 stroke-down'"
            viewBox="0 0 24 24"
            fill="none"
            stroke-width="4"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </span>
      } @else if (player.status === PlayerStatus.DeUltimated) {
        <img
          [class]="badgeClass() + (large() ? ' p-0.75' : ' p-0.5')"
          icon
          [eager]="large()"
          [name]="PlayerType.Ironman"
        />
      }
      @if (player.diedAsHardcore) {
        <img
          [class]="
            large()
              ? 'absolute -right-1.75 -bottom-1.75 size-6.5 p-0.75 rounded-full border border-line bg-deep'
              : 'absolute -right-1.5 -bottom-1.5 size-5 p-0.5 rounded-full border border-line bg-deep'
          "
          icon
          [eager]="large()"
          name="dead"
        />
      }
    </span>

    <ng-template #modeTooltip>
      <div class="font-bold text-strong">
        {{ mode().label }}
        @if (mode().change) {
          · <span class="text-down">{{ mode().change }}</span>
        }
      </div>
      @if (mode().note) {
        <div>{{ mode().note }}</div>
      }
    </ng-template>
  `,
  // In a row the tile sits inside a link, which may not hold another focusable element: there it isn't focusable
  host: { class: 'shrink-0' },
  imports: [Icon, Tooltip],
})
export class AccountTile {
  readonly PlayerStatus: typeof PlayerStatus = PlayerStatus;
  readonly PlayerType: typeof PlayerType = PlayerType;
  readonly SkillEnum: typeof SkillEnum = SkillEnum;

  readonly account: InputSignal<Player> = input.required();
  /** The player page's 64px tile, focusable; otherwise a list row's 40px (32px on phones) one */
  readonly large: InputSignalWithTransform<boolean, unknown> = input(false, { transform: booleanAttribute });

  readonly mode: Signal<AccountMode> = computed(() => {
    const { type, status, diedAsHardcore } = this.account();
    const label = TYPE_LABELS[type];

    if (status === PlayerStatus.DeIroned) {
      const note = 'No longer an ironman; ranked on the regular hiscores.';
      return { label, change: diedAsHardcore ? 'Died, de-ironed' : 'De-ironed', note };
    }
    if (status === PlayerStatus.DeUltimated) {
      return { label, change: 'De-ultimated', note: 'Now a regular ironman; ranked on the ironman hiscores.' };
    }
    if (diedAsHardcore) {
      return { label, change: 'Died', note: 'Lost hardcore status; now ranked on the regular ironman hiscores.' };
    }
    return { label };
  });
  readonly modeText: Signal<string> = computed(() =>
    [this.mode().label, this.mode().change, this.mode().note].filter(Boolean).join('. '),
  );

  readonly badgeClass: Signal<string> = computed(() =>
    this.large()
      ? 'absolute -left-1.75 -bottom-1.75 size-6.5 rounded-full border border-line bg-deep'
      : 'absolute -left-1.5 -bottom-1.5 size-5 rounded-full border border-line bg-deep',
  );
}
