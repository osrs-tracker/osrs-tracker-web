import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { ActivityEnum, HiscoreEntry } from '@osrs-tracker/models';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { Tooltip } from '@app/common/ui/tooltip/tooltip';
import { CapitalizePipe } from '@app/common/format/capitalize-pipe';
import { Icon } from '@app/common/icon/icon';
import { CLUE_LAYOUT, fillRows, MINIGAME_ROWS } from '../activity-categories';
import { ActivityGrid } from './activity-grid';
import { RankLines } from './rank-lines';

/** The Other tab: Clues, then Minigames, each under its own label */
@Component({
  selector: 'other-grids',
  imports: [ActivityGrid, CapitalizePipe, DecimalPipe, Icon, RankLines, Skeleton, Tooltip],
  template: `
    <h2 class="flex items-center h-10 px-5 border-b border-line text-sm font-bold text-muted">Clues</h2>
    <activity-grid
      view="clues"
      scoreLabel="Completed"
      [layout]="clueLayout"
      [hiscore]="hiscore()"
      [gains]="gains()"
      [hasFooter]="true"
      [atCardBottom]="false"
    >
      <!-- Outside the grid, as it isn't charted, so its own Tab stop: keyboard focus opens the tooltip -->
      <div
        class="flex items-center justify-center gap-2 h-11 bg-inner text-base focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-strong"
        [attr.tabindex]="clueTotal() !== undefined ? 0 : null"
        [tooltip]="clueTotal() !== undefined"
        [tooltipTemplate]="clueTooltip"
        [tooltipUnderline]="false"
      >
        @if (clueTotal() !== undefined) {
          <img class="h-5 w-auto" icon alt="" [name]="ActivityEnum.ClueScrollsAll" [activity]="true" />
          <span>Total clues:</span>
          <span class="font-bold text-strong tabular-nums">{{ clueTotal()! > 0 ? (clueTotal() | number) : '–' }}</span>
        } @else {
          <skeleton class="h-5 w-32" />
        }
      </div>
      <ng-template #clueTooltip>
        @let gain = gains().get(ActivityEnum.ClueScrollsAll) ?? 0;
        <div class="flex justify-between gap-4">
          <div>Completed:</div>
          <div class="tabular-nums">{{ clueTotal()! > 0 ? (clueTotal() | number) : '–' }}</div>
        </div>
        <rank-lines kind="activities" [name]="ActivityEnum.ClueScrollsAll" [rank]="clueRank()" />
        @if (gain > 0) {
          <div class="pt-1 text-muted">+{{ gain | number }} in these days</div>
        }
      </ng-template>
    </activity-grid>

    <h2 class="flex items-center h-10 px-5 border-b border-line text-sm font-bold text-muted">Minigames</h2>
    @if (!hiscore() || minigameLayout().length) {
      <activity-grid
        view="minigames"
        [layout]="hiscore() ? minigameLayout() : minigameSkeleton"
        [hiscore]="hiscore()"
        [gains]="gains()"
        [minigame]="minigame()"
      />
    } @else {
      <p class="px-5 py-8 text-center text-base text-muted">
        {{ username() | capitalizeWords }} isn’t ranked in any minigame.
      </p>
    }
  `,
  host: { class: 'block' },
})
export class OtherGrids {
  readonly username = input.required<string>();
  /** `undefined` while the hiscores load */
  readonly hiscore = input.required<HiscoreEntry | undefined>();
  readonly gains = input.required<ReadonlyMap<string, number>>();
  readonly minigame = input<string>();

  readonly clueLayout: (string | null)[] = CLUE_LAYOUT;
  readonly minigameLayout = computed(() => {
    const hiscore = this.hiscore();
    const ranked = (name: string): boolean => hiscore?.activities[name] != null;
    return MINIGAME_ROWS.flatMap(row => fillRows(row.filter(ranked)));
  });
  readonly minigameSkeleton: (string | null)[] = MINIGAME_ROWS[0];
  readonly ActivityEnum: typeof ActivityEnum = ActivityEnum;
  readonly clueTotal = computed(() => this.hiscore()?.activities[ActivityEnum.ClueScrollsAll]?.score);
  readonly clueRank = computed(() => this.hiscore()?.activities[ActivityEnum.ClueScrollsAll]?.rank);
}
