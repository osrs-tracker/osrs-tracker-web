import { Grid, GridCell, GridCellWidget, GridRow } from '@angular/aria/grid';
import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, input, InputSignal, Signal, viewChild } from '@angular/core';
import { ActivityEnum } from '@osrs-tracker/hiscores';
import { HiscoreActivity, HiscoreEntry } from '@osrs-tracker/models';
import { SkeletonComponent } from 'src/app/common/components/general/skeleton.component';
import { TooltipComponent } from 'src/app/common/components/general/tooltip/tooltip.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { setGridTabStop } from 'src/app/common/helpers/aria-tab-stop';
import { formatNumberShort } from 'src/app/common/helpers/number.helper';
import { ThemeService } from 'src/app/common/services/theme.service';
import { UNCHARTED_MINIGAMES } from '../../activity-categories';
import { CHART_CATEGORIES } from '../player-logs/chart-categories';
import { chartColors } from '../../chart-colors';
import { ActivityView, PlayerView } from '../player-view';
import { pickedCellBackground, pickedCellRing } from './picked-cell';

const GRID_LABELS: Record<ActivityView, string> = {
  bosses: 'Bosses',
  raids: 'Raids',
  clues: 'Clue scrolls',
  minigames: 'Minigames',
};

interface ActivityCell {
  name: string;
  activity?: HiscoreActivity;
  /** Gained in the charted days */
  gain: number;
  /** Has gains to chart, so picking it changes the chart */
  charted: boolean;
  on: boolean;
  color: string;
  /** Why a minigame isn't charted */
  why?: string;
  icon: { name: string; activity: boolean };
  /** Marks Legacy Bounty Hunter, which reuses the current icons */
  badge?: string;
  /** Empty cell that completes a row */
  filler: boolean;
}

/**
 * Hiscores of one activity category in rows of three. Activities with gains are outlined in their chart colour and
 * chart their category when picked, or toggle their series once it's charted.
 *
 * An `@angular/aria` grid, like the skill grid: one Tab stop, the arrow keys move between cells, Enter or Space picks
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
                <div ngGridCell role="gridcell" class="flex">
                  <button
                    ngGridCellWidget
                    type="button"
                    class="flex-1 flex items-center justify-center h-11 bg-inner aria-disabled:cursor-default focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-strong"
                    [class]="(view() === 'minigames' ? 'px-2 ' : 'px-3 ') + corner(r, c, last)"
                    [style.background]="cell.on ? tint(cell.color) : null"
                    [style.box-shadow]="
                      cell.charted
                        ? cell.on
                          ? ring(cell.color)
                          : 'inset 0 0 0 1px color-mix(in oklch, ' + cell.color + ' 45%, transparent)'
                        : null
                    "
                    [attr.aria-disabled]="!cell.charted"
                    [attr.aria-pressed]="cell.charted ? cell.on : null"
                    [attr.aria-label]="cellLabel(cell)"
                    [tooltip]="!!cell.activity"
                    [tooltipTemplate]="tooltipTemplate"
                    [tooltipUnderline]="false"
                    (click)="cell.charted && playerView.pickActivity(view(), cell.name)"
                  >
                    @if (cell.activity; as activity) {
                      <span
                        class="flex items-center w-full"
                        [class]="view() === 'minigames' ? 'gap-1.5' : 'max-w-21 gap-2'"
                      >
                        @if (view() === 'minigames') {
                          <!-- minigame icons vary from 16 to 96px, so they're fitted to the box instead of scaled -->
                          <span class="relative flex items-center justify-center size-7 shrink-0">
                            <img class="size-6" icon [name]="cell.icon.name" [activity]="cell.icon.activity" />
                            @if (cell.badge) {
                              <span
                                class="absolute -right-1.5 -bottom-1 min-w-3.5 h-3.5 px-0.75 rounded-full bg-line text-strong text-center text-2xs leading-3.5 font-bold"
                                aria-hidden="true"
                                >{{ cell.badge }}</span
                              >
                            }
                          </span>
                        } @else {
                          <span class="flex items-center justify-center size-7 shrink-0">
                            <img icon [name]="cell.icon.name" [activity]="true" [scale]="1.5" />
                          </span>
                        }
                        <span class="ml-auto text-base font-bold text-strong tabular-nums">{{
                          shortScore(activity.score)
                        }}</span>
                      </span>
                    } @else {
                      <skeleton class="h-5 w-20" />
                    }
                  </button>
                </div>

                <ng-template #tooltipTemplate>
                  <div class="font-bold text-strong">{{ cell.name }}</div>
                  <div class="flex justify-between gap-4">
                    <div>
                      <div>{{ scoreLabel() }}:</div>
                      @if (view() !== 'minigames') {
                        <div>Rank:</div>
                      }
                    </div>
                    <div class="text-right tabular-nums">
                      <div>{{ (cell.activity?.score ?? -1) > 0 ? (cell.activity?.score | number) : '–' }}</div>
                      @if (view() !== 'minigames') {
                        <div>{{ (cell.activity?.rank ?? -1) > 0 ? (cell.activity?.rank | number) : 'Unranked' }}</div>
                      }
                    </div>
                  </div>
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
  imports: [DecimalPipe, Grid, GridCell, GridCellWidget, GridRow, IconDirective, SkeletonComponent, TooltipComponent],
})
export class ActivityGridComponent {
  readonly playerView = inject(PlayerView);
  private readonly darkMode = inject(ThemeService).darkMode;

  readonly view: InputSignal<ActivityView> = input.required();
  /** Activity names in grid order; `null` is an empty cell */
  readonly layout: InputSignal<(string | null)[]> = input.required();
  /** Undefined while the hiscores load */
  readonly hiscore: InputSignal<HiscoreEntry | undefined> = input.required();
  /** Each activity's gain over the charted days */
  readonly gains: InputSignal<ReadonlyMap<string, number>> = input.required();
  readonly scoreLabel: InputSignal<string> = input('Score');
  /** The charted minigame */
  readonly minigame: InputSignal<string | undefined> = input();
  /** A full-width row follows (the clue total), so the last row keeps square corners */
  readonly hasFooter: InputSignal<boolean> = input(false);

  /** The colours the chart gives the category's activities with gains */
  readonly #colors: Signal<Map<string, string>> = computed(() => {
    const category = CHART_CATEGORIES[this.view()];
    const series = [...this.gains()].filter(([name]) => category.has(name)).map(([name, total]) => ({ name, total }));
    return chartColors(series, this.darkMode());
  });

  readonly cells: Signal<ActivityCell[]> = computed(() => {
    const view = this.view();
    const charting = this.playerView.chart() === view;
    const hidden = this.playerView.hidden();

    return this.layout().map(name => {
      if (!name) return { filler: true } as ActivityCell;

      const activity = this.hiscore()?.activities.find(a => a.name === name);
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

  /** The cells in rows of three, as the grid reads them */
  readonly rows: Signal<ActivityCell[][]> = computed(() => {
    const cells = this.cells();
    return Array.from({ length: Math.ceil(cells.length / 3) }, (_, i) => cells.slice(i * 3, i * 3 + 3));
  });

  private readonly grid: Signal<Grid | undefined> = viewChild(Grid);

  constructor() {
    effect(() => setGridTabStop(this.grid()));
  }

  /** A picked cell's background, as in the skill grid */
  tint(color: string): string {
    return pickedCellBackground(color);
  }

  /** A picked cell's outline, as in the skill grid */
  ring(color: string): string {
    return pickedCellRing(color);
  }

  /** Corner cells follow the grid's rounded corners, so their selection ring isn't clipped */
  corner(row: number, col: number, lastRow: boolean): string {
    if (row === 0 && col === 0) return 'rounded-tl-xl';
    if (row === 0 && col === 2) return 'rounded-tr-xl';
    if (!lastRow || this.hasFooter()) return '';
    if (col === 0) return 'rounded-bl-xl';
    if (col === 2) return 'rounded-br-xl';
    return '';
  }

  /** The grid's name for screen readers */
  label(): string {
    return GRID_LABELS[this.view()];
  }

  cellLabel(cell: ActivityCell): string {
    const score = (cell.activity?.score ?? -1) > 0 ? cell.activity!.score.toLocaleString('en-US') : 'none';
    return `${cell.name}, ${this.scoreLabel().toLowerCase()} ${score}`;
  }

  /** Four digits fit a cell; from 10,000 up the score is shortened (18.2K), the tooltip has the exact one */
  shortScore(score: number): string {
    if (score <= 0) return '–';
    if (score < 10_000) return score.toLocaleString('en-US');
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
