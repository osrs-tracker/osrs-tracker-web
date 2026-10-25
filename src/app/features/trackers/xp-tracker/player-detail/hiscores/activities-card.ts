import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { ActivityEnum, HiscoreEntry } from '@osrs-tracker/models';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { CapitalizePipe } from '@app/common/format/capitalize-pipe';
import { CLUE_LAYOUT, fillRows, MINIGAME_ROWS } from '../activity-categories';
import { BottomTab, PlayerView } from '../player-view';
import { ActivityGrid } from './activity-grid';

const TABS: SegmentedOption<BottomTab>[] = [
  { value: 'clues', label: 'Clues' },
  { value: 'minigames', label: 'Minigames' },
];

@Component({
  selector: 'article[activities-card]',
  imports: [ActivityGrid, CapitalizePipe, DecimalPipe, Segmented, Skeleton],
  template: `
    <div class="flex items-center min-h-14 px-4 py-1.5 border-b border-line">
      <segmented
        class="grow"
        stretch
        label="Clues and minigames"
        [options]="tabs"
        [value]="playerView.bottom()"
        (picked)="playerView.showBottom($event)"
      />
    </div>
    <div class="px-4 pt-4">
      @if (playerView.bottom() === 'clues') {
        <activity-grid
          view="clues"
          scoreLabel="Completed"
          [layout]="clueLayout"
          [hiscore]="hiscore()"
          [gains]="gains()"
          [hasFooter]="true"
        >
          <div class="flex items-center justify-center gap-1.5 h-11 bg-inner text-base">
            @if (clueTotal() !== undefined) {
              <span>Total clues:</span>
              <span class="font-bold text-strong tabular-nums">{{
                clueTotal()! > 0 ? (clueTotal() | number) : '–'
              }}</span>
            } @else {
              <skeleton class="h-5 w-32" />
            }
          </div>
        </activity-grid>
      } @else if (!hiscore() || minigameLayout().length) {
        <activity-grid
          view="minigames"
          [layout]="hiscore() ? minigameLayout() : minigameSkeleton"
          [hiscore]="hiscore()"
          [gains]="gains()"
          [minigame]="minigame()"
        />
      } @else {
        <p class="py-3 text-center text-base text-muted">
          {{ username() | capitalizeWords }} isn’t ranked in any minigame.
        </p>
      }
    </div>
  `,
  host: {
    class: 'min-w-0 pb-4 rounded-2xl bg-card overflow-hidden',
  },
})
export class ActivitiesCard {
  readonly playerView = inject(PlayerView);

  readonly username = input.required<string>();
  /** `undefined` while the hiscores load */
  readonly hiscore = input.required<HiscoreEntry | undefined>();
  readonly gains = input.required<ReadonlyMap<string, number>>();
  readonly minigame = input<string>();

  readonly tabs: SegmentedOption<BottomTab>[] = TABS;
  readonly clueLayout: (string | null)[] = CLUE_LAYOUT;
  readonly minigameLayout = computed(() => {
    const hiscore = this.hiscore();
    const ranked = (name: string): boolean => hiscore?.activities[name] != null;
    return MINIGAME_ROWS.flatMap(row => fillRows(row.filter(ranked)));
  });
  readonly minigameSkeleton: (string | null)[] = MINIGAME_ROWS[0];
  readonly clueTotal = computed(() => this.hiscore()?.activities[ActivityEnum.ClueScrollsAll]?.score);
}
