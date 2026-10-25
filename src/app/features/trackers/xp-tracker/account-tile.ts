import { Component, booleanAttribute, computed, input } from '@angular/core';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { Icon } from '@app/common/icon/icon';
import { Tooltip } from '@app/common/ui/tooltip/tooltip';
import { LucideUser, LucideX } from '@lucide/angular';

interface AccountMode {
  label: string;
  change?: string;
  note?: string;
}

const TYPE_LABELS: Record<PlayerType, string> = {
  [PlayerType.Normal]: 'Regular',
  [PlayerType.Ironman]: 'Ironman',
  [PlayerType.Hardcore]: 'Hardcore ironman',
  [PlayerType.Ultimate]: 'Ultimate ironman',
};

@Component({
  selector: 'account-tile',
  template: `
    @let player = account();

    <!-- a tooltip rather than a title, so the account type also shows on touch; one image, named by its label (the
         tooltip's text, so it doesn't describe it too) -->
    <span
      role="img"
      [class]="
        'relative flex items-center justify-center border border-line bg-deep ' +
        (large() ? 'size-16 rounded-2xl' : 'size-10 max-sm:size-8 rounded-xl')
      "
      [attr.tabindex]="large() ? 0 : null"
      [attr.aria-label]="modeText()"
      [tooltip]="true"
      [tooltipTemplate]="modeTooltip"
      [tooltipUnderline]="false"
      [tooltipDescribe]="false"
    >
      @if (player.type === PlayerType.Normal) {
        <svg lucideUser [class]="large() ? 'size-9 stroke-text' : 'size-5.5 max-sm:size-4.5 stroke-text'" />
      } @else {
        <img
          [class]="large() ? 'size-10' : 'size-6 max-sm:size-5'"
          icon
          alt=""
          [eager]="large()"
          [name]="player.type"
        />
      }

      @if (player.status === PlayerStatus.DeIroned) {
        <span [class]="badgeClass() + ' flex items-center justify-center'">
          <svg lucideX [class]="large() ? 'size-4 stroke-down' : 'size-3 stroke-down'" strokeWidth="4" />
        </span>
      } @else if (player.status === PlayerStatus.DeUltimated) {
        <img
          [class]="badgeClass() + (large() ? ' p-0.75' : ' p-0.5')"
          icon
          alt=""
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
          alt=""
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
  imports: [Icon, Tooltip, LucideUser, LucideX],
})
export class AccountTile {
  readonly PlayerStatus: typeof PlayerStatus = PlayerStatus;
  readonly PlayerType: typeof PlayerType = PlayerType;

  readonly account = input.required<Player>();
  readonly large = input(false, { transform: booleanAttribute });

  readonly mode = computed<AccountMode>(() => {
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
  readonly modeText = computed(() =>
    [this.mode().label, this.mode().change, this.mode().note].filter(Boolean).join('. '),
  );

  readonly badgeClass = computed(() =>
    this.large()
      ? 'absolute -left-1.75 -bottom-1.75 size-6.5 rounded-full border border-line bg-deep'
      : 'absolute -left-1.5 -bottom-1.5 size-5 rounded-full border border-line bg-deep',
  );
}
