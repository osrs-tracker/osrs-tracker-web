import { Grid, GridCell, GridCellWidget, GridRow } from '@angular/aria/grid';
import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { ActivityEnum, HiscoreActivity, HiscoreEntry } from '@osrs-tracker/models';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { Tooltip } from '@app/common/ui/tooltip/tooltip';
import { Icon } from '@app/common/icon/icon';
import { formatNumberShort, formatWhole } from '@app/common/format/number-format';
import { UNCHARTED_MINIGAMES } from '../activity-categories';
import { CHART_CATEGORIES } from '../charts/chart-categories';
import { chartColors } from '../colors/chart-colors';
import { ActivityView } from '../player-view';
import { HiscoresGrid } from './hiscores-grid';
import { rowsOfThree } from './picked-cell';
import { RankLines } from './rank-lines';

const GRID_LABELS: Record<ActivityView, string> = {
  bosses: 'Bosses',
  raids: 'Raids',
  clues: 'Clue scrolls',
  minigames: 'Minigames',
};

interface ActivityCell {
  name: string;
  /** `null` without a score; the cell is a skeleton only while the hiscores load */
  activity?: HiscoreActivity | null;
  gain: number;
  charted: boolean;
  on: boolean;
  color: string;
  /** Why a minigame isn't charted */
  why?: string;
  icon: { name: string; activity: boolean };
  /** Marks Legacy Bounty Hunter, which reuses the current icons */
  badge?: string;
  filler: boolean;
}

/**
 * An `@angular/aria` grid: one Tab stop, the arrow keys move between cells, Enter or Space picks
 * one. Cells without gains stay reachable (`aria-disabled`) for their tooltip, but aren't picked.
 */
@Component({
  selector: 'activity-grid',
  template: `
    <div class="flex flex-col gap-px overflow-hidden rounded-xl border border-line bg-line">
      <!-- One Tab stop, the arrow keys move between cells; the footer (the clue total) isn't part of it -->
      <div ngGrid class="flex flex-col gap-px" colWrap="continuous" rowWrap="nowrap" [attr.aria-label]="label()">
        @for (row of rows(); track $index; let r = $index; let last = $last) {
          <div ngGridRow class="grid grid-cols-3 gap-px">
            @for (cell of row; track $index; let c = $index) {
              @if (cell.filler) {
                <div class="h-11 bg-inner" role="gridcell"></div>
              } @else {
                <div ngGridCell role="gridcell" class="flex @container">
                  <button
                    ngGridCellWidget
                    type="button"
                    class="flex-1 flex items-center justify-center min-w-0 h-11 bg-inner aria-disabled:cursor-default focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-strong"
                    [class]="
                      (view() === 'minigames' ? 'px-2 ' : 'px-2 @cell:px-3 ') +
                      '@max-cell-xs:px-1 ' +
                      corner(r, c, last)
                    "
                    [style.background]="cell.on ? tint(cell.color) : null"
                    [style.box-shadow]="cell.charted ? (cell.on ? ring(cell.color) : pickableRing(cell.color)) : null"
                    [attr.aria-disabled]="!cell.charted"
                    [attr.aria-pressed]="cell.charted ? cell.on : null"
                    [attr.aria-label]="cellLabel(cell)"
                    [tooltip]="cell.activity !== undefined"
                    [tooltipTemplate]="tooltipTemplate"
                    [tooltipUnderline]="false"
                    [tooltipDescribe]="false"
                    (click)="cell.charted && playerView.pickActivity(view(), cell.name)"
                  >
                    @if (cell.activity !== undefined) {
                      <span
                        class="flex items-center w-full"
                        [class]="
                          view() === 'minigames'
                            ? 'gap-1.5 @max-cell-xs:gap-1'
                            : 'max-w-21 gap-1.5 @cell:gap-2 @max-cell-xs:gap-1'
                        "
                      >
                        @if (view() === 'minigames') {
                          <!-- minigame icons vary from 16 to 96px, so they're fitted to the box instead of scaled -->
                          <span class="relative flex items-center justify-center size-7 shrink-0">
                            <img class="size-6" icon alt="" [name]="cell.icon.name" [activity]="cell.icon.activity" />
                            @if (cell.badge) {
                              <span
                                class="absolute -right-1.5 -bottom-1 min-w-3.5 h-3.5 px-1 rounded-full bg-line text-strong text-center text-2xs leading-3.5 font-bold"
                                aria-hidden="true"
                                >{{ cell.badge }}</span
                              >
                            }
                          </span>
                        } @else {
                          <span class="flex items-center justify-center size-7 shrink-0">
                            <img icon alt="" [name]="cell.icon.name" [activity]="true" [scale]="1.5" />
                          </span>
                        }
                        @let score = shortScore(cell.activity?.score);
                        @let tightScore = shortScore(cell.activity?.score, 1_000);
                        <span class="ml-auto text-base @max-cell-xs:text-sm font-bold text-strong tabular-nums">
                          @if (tightScore === score) {
                            {{ score }}
                          } @else {
                            <span class="@max-cell-xs:hidden">{{ score }}</span>
                            <span class="hidden @max-cell-xs:inline">{{ tightScore }}</span>
                          }
                        </span>
                      </span>
                    } @else {
                      <skeleton class="h-5 w-20" />
                    }
                  </button>
                </div>

                <ng-template #tooltipTemplate>
                  <div class="font-bold text-strong">{{ cell.name }}</div>
                  <div class="flex justify-between gap-4">
                    <div>{{ scoreLabel() }}:</div>
                    <div class="tabular-nums">{{ cell.activity ? (cell.activity.score | number) : '–' }}</div>
                  </div>
                  @if (view() !== 'minigames') {
                    <rank-lines kind="activities" [name]="cell.name" [rank]="cell.activity?.rank" />
                  }
                  @if (cell.charted) {
                    <div class="pt-1 text-muted">+{{ cell.gain | number }} in these days</div>
                  } @else if (cell.why) {
                    <div class="pt-1 text-muted">{{ cell.why }}</div>
                  }
                </ng-template>
              }
            }
          </div>
        }
      </div>
      <ng-content />
    </div>
  `,
  imports: [DecimalPipe, Grid, GridCell, GridCellWidget, GridRow, Icon, RankLines, Skeleton, Tooltip],
})
export class ActivityGrid extends HiscoresGrid {
  readonly view = input.required<ActivityView>();
  /** Activity names in grid order; `null` is an empty cell */
  readonly layout = input.required<(string | null)[]>();
  /** Undefined while the hiscores load */
  readonly hiscore = input.required<HiscoreEntry | undefined>();
  readonly gains = input.required<ReadonlyMap<string, number>>();
  readonly scoreLabel = input('Score');
  readonly minigame = input<string>();
  /** A full-width row follows (the clue total), so the last row keeps square corners */
  readonly hasFooter = input(false);

  readonly #colors = computed(() => {
    const category = CHART_CATEGORIES[this.view()];
    const series = [...this.gains()].filter(([name]) => category.has(name)).map(([name, total]) => ({ name, total }));
    return chartColors(series, this.darkMode());
  });

  readonly cells = computed(() => {
    const view = this.view();
    const charting = this.playerView.chart() === view;
    const hidden = this.playerView.hidden();

    return this.layout().map(name => {
      if (!name) return { filler: true } as ActivityCell;

      const hiscore = this.hiscore();
      const activity = hiscore && (hiscore.activities[name] ?? null);
      const gain = this.gains().get(name) ?? 0;
      const why = view === 'minigames' ? UNCHARTED_MINIGAMES[name as ActivityEnum] : undefined;
      const charted = !!activity && gain > 0 && !why;
      const legacy = name === ActivityEnum.BountyHunterLegacy || name === ActivityEnum.BountyHunterLegacyRogue;

      return {
        name,
        activity,
        gain,
        charted,
        on: charted && charting && (view === 'minigames' ? this.minigame() === name : !hidden.has(name)),
        color: this.#colors().get(name) ?? '',
        why: why ?? (view === 'minigames' && !charted ? 'No gains in these days' : undefined),
        icon: this.icon(name),
        badge: legacy ? 'L' : undefined,
        filler: false,
      };
    });
  });

  readonly rows = computed(() => rowsOfThree(this.cells()));

  /** Corner cells follow the grid's rounded corners, so their selection ring isn't clipped */
  corner(row: number, col: number, lastRow: boolean): string {
    if (row === 0 && col === 0) return 'rounded-tl-xl';
    if (row === 0 && col === 2) return 'rounded-tr-xl';
    if (!lastRow || this.hasFooter()) return '';
    if (col === 0) return 'rounded-bl-xl';
    if (col === 2) return 'rounded-br-xl';
    return '';
  }

  label(): string {
    return GRID_LABELS[this.view()];
  }

  cellLabel(cell: ActivityCell): string {
    const score = cell.activity ? formatWhole(cell.activity.score) : 'none';
    return `${cell.name}, ${this.scoreLabel().toLowerCase()} ${score}`;
  }

  /**
   * Four digits fit a cell; from 10,000 up the score is shortened (18.2K), the tooltip and label have the exact one.
   * The narrowest cells (`@max-cell-xs`) shorten from 1,000.
   */
  shortScore(score: number | undefined, shortFrom = 10_000): string {
    if (score === undefined) return '–';
    if (score < shortFrom) return formatWhole(score);
    return formatNumberShort(score);
  }

  /** Legacy Bounty Hunter reuses the current icons; Deadman has no hiscores icon, so the skull stands in */
  private icon(name: string): { name: string; activity: boolean } {
    if (name === ActivityEnum.BountyHunterLegacy) return { name: ActivityEnum.BountyHunter, activity: true };
    if (name === ActivityEnum.BountyHunterLegacyRogue) return { name: ActivityEnum.BountyHunterRogue, activity: true };
    if (name === ActivityEnum.DeadmanPoints) return { name: 'dead', activity: false };
    return { name, activity: true };
  }
}
