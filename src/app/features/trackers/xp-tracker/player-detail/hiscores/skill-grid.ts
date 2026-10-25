import { Grid, GridCell, GridCellWidget, GridRow } from '@angular/aria/grid';
import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, input, viewChild } from '@angular/core';
import {
  calculateXPForSkillLevel,
  calculateXPToNextLevel,
  HiscoreEntry,
  overallOf,
  SkillEnum,
  skillProgress,
} from '@osrs-tracker/models';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { Tooltip } from '@app/common/ui/tooltip/tooltip';
import { Icon } from '@app/common/icon/icon';
import { SKILL_LAYOUT } from '@app/common/format/skill-layout';
import { setGridTabStop } from '@app/common/ui/controls/aria-tab-stop';
import { ThemeStore } from '@app/common/theme/theme-store';
import { ChartSkill, SKILL_COLORS } from '../colors/skill-colors';
import { PlayerView } from '../player-view';
import { pickableCellRing, pickedCellBackground, pickedCellRing, rowsOfThree } from './picked-cell';
import { RankLines } from './rank-lines';

interface SkillCell {
  name: SkillEnum;
  /** False while the hiscores load; the cell is a skeleton */
  loaded: boolean;
  level: number;
  /** XP shown and used for progress; an untrained skill has none */
  xp: number;
  /** On the main table; `null` or `undefined` unranked */
  rank?: number | null;
  /** Below 99 only */
  progress?: number;
  /** XP gained in the charted days */
  gain: number;
  /** Gained XP, so it can be picked to chart */
  charted: boolean;
  on: boolean;
  /** Its line colour in the XP gained chart */
  color: string;
}

// Overall's line is drawn in the accent colour
const OVERALL_COLOR = 'var(--accent)';

/**
 * The skill levels with their progress to the next level; picking skills that gained XP compares them on the chart. As in
 * the activity grid, those are outlined in their chart colour and tinted when picked, so the grid reads as the chart's
 * legend.
 *
 * An `@angular/aria` grid: one Tab stop, the arrow keys move between cells, Enter or Space toggles one. Cells without gains
 * stay reachable (`aria-disabled`), as their tooltip has the XP; they just don't toggle.
 */
@Component({
  selector: 'skill-grid',
  template: `
    <!-- Rows of three, the total level as a full-width last row; one Tab stop, the arrow keys move between cells -->
    <div
      ngGrid
      class="flex flex-col gap-px overflow-hidden rounded-xl border border-line bg-line"
      colWrap="continuous"
      rowWrap="nowrap"
      aria-label="Skills"
    >
      @for (row of rows(); track $index; let r = $index) {
        <div ngGridRow class="grid grid-cols-3 gap-px">
          @for (cell of row; track cell.name; let c = $index) {
            <div ngGridCell role="gridcell" class="flex">
              <button
                ngGridCellWidget
                type="button"
                class="flex-1 flex flex-col justify-between bg-inner aria-disabled:cursor-default focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-strong"
                [class]="r === 0 ? (c === 0 ? 'rounded-tl-xl' : c === 2 ? 'rounded-tr-xl' : '') : ''"
                [style.background]="cell.on ? tint(cell.color) : null"
                [style.box-shadow]="cell.charted ? (cell.on ? ring(cell.color) : pickableRing(cell.color)) : null"
                [attr.aria-disabled]="!cell.charted"
                [attr.aria-pressed]="cell.charted ? cell.on : null"
                [attr.aria-label]="label(cell)"
                [tooltip]="cell.loaded"
                [tooltipTemplate]="tooltipTemplate"
                [tooltipUnderline]="false"
                [tooltipDescribe]="false"
                (click)="cell.charted && playerView.toggleSkill(cell.name)"
              >
                <span class="flex items-center justify-between h-9.25 pt-1.75 pb-1.5 px-3">
                  @if (cell.loaded) {
                    <img class="h-6 w-auto" icon alt="" [name]="cell.name" [skill]="true" />
                    <span class="text-base font-bold text-strong tabular-nums">{{ cell.level }}</span>
                  } @else {
                    <skeleton class="mx-auto h-5 w-16" />
                  }
                </span>
                <!-- A picked cell's outline is drawn below its content, so the bar moves inside it -->
                <span class="block h-0.75 bg-line" [class]="cell.on ? 'mx-0.5 -translate-y-0.5' : ''">
                  @if (cell.progress !== undefined) {
                    <span class="block h-0.75 bg-accent-hover" [style.width.%]="cell.progress"></span>
                  }
                </span>
              </button>
            </div>

            <ng-template #tooltipTemplate>
              <div class="flex justify-between gap-4">
                <div>
                  <div>{{ cell.name }} XP:</div>
                  @if (cell.progress !== undefined) {
                    <div>Next level at:</div>
                    <div>Remaining XP:</div>
                  }
                </div>
                <div class="text-right tabular-nums">
                  <div>{{ cell.xp | number }}</div>
                  @if (cell.progress !== undefined) {
                    <div>{{ xpForLevel(cell.level + 1) | number }}</div>
                    <div>{{ xpToNextLevel(cell.xp, cell.level) | number }}</div>
                  }
                </div>
              </div>
              <rank-lines kind="skills" [name]="cell.name" [rank]="cell.rank" />
              @if (cell.progress !== undefined) {
                <div class="pt-1 text-muted">{{ cell.progress | number: '1.0-0' }}% to level {{ cell.level + 1 }}</div>
              }
              <div class="pt-1 text-muted">
                {{ cell.charted ? '+' + (cell.gain | number) + ' XP in these days' : 'No XP gained in these days' }}
              </div>
            </ng-template>
          }
        </div>
      }

      <div ngGridRow>
        <div ngGridCell role="gridcell" class="flex" [colSpan]="3">
          <button
            ngGridCellWidget
            type="button"
            class="flex-1 flex items-center justify-center gap-2 h-11 bg-inner rounded-b-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-strong"
            [style.background]="overallOn() ? tint(OVERALL_COLOR) : null"
            [style.box-shadow]="overallOn() ? ring(OVERALL_COLOR) : null"
            [attr.aria-pressed]="overallOn()"
            (click)="playerView.toggleSkill(SkillEnum.Overall)"
          >
            @if (overall(); as overall) {
              <img class="h-5.5 w-auto" icon alt="" [name]="SkillEnum.Overall" [skill]="true" />
              <span>Total level:</span>
              <span class="text-base font-bold text-strong tabular-nums">{{ overall.level | number }}</span>
            } @else {
              <skeleton class="h-5 w-32" />
            }
          </button>
        </div>
      </div>
    </div>
  `,
  imports: [DecimalPipe, Grid, GridCell, GridCellWidget, GridRow, Icon, RankLines, Skeleton, Tooltip],
})
export class SkillGrid {
  readonly playerView = inject(PlayerView);
  private readonly darkMode = inject(ThemeStore).darkMode;

  readonly SkillEnum: typeof SkillEnum = SkillEnum;
  readonly OVERALL_COLOR: string = OVERALL_COLOR;
  readonly xpForLevel: typeof calculateXPForSkillLevel = calculateXPForSkillLevel;
  readonly xpToNextLevel: typeof calculateXPToNextLevel = calculateXPToNextLevel;

  /** Undefined while the hiscores load */
  readonly hiscore = input.required<HiscoreEntry | undefined>();
  /** Each skill's XP gained over the charted days */
  readonly gains = input.required<ReadonlyMap<string, number>>();

  readonly cells = computed<SkillCell[]>(() => {
    const selected = this.playerView.skills();
    const theme = this.darkMode() ? 'dark' : 'light';
    return SKILL_LAYOUT.map(name => {
      const hiscore = this.hiscore();
      const loaded = !!hiscore;
      // an untrained skill (`null`) shows level 1 with no XP
      const { level, xp, percentToNextLevel } = skillProgress(hiscore?.skills[name]);
      const gain = this.gains().get(name) ?? 0;
      return {
        name,
        loaded,
        level,
        xp,
        rank: hiscore?.skills[name]?.rank,
        progress: loaded ? (percentToNextLevel ?? undefined) : undefined,
        gain,
        charted: loaded && gain > 0,
        on: selected.has(name),
        color: SKILL_COLORS[name as ChartSkill][theme],
      };
    });
  });
  readonly rows = computed(() => rowsOfThree(this.cells()));
  readonly overall = computed(() => {
    const hiscore = this.hiscore();
    return hiscore && overallOf(hiscore);
  });
  readonly overallOn = computed(() => this.playerView.skills().has(SkillEnum.Overall));

  private readonly grid = viewChild(Grid);

  protected readonly tint = pickedCellBackground;
  protected readonly ring = pickedCellRing;
  protected readonly pickableRing = pickableCellRing;

  constructor() {
    effect(() => setGridTabStop(this.grid()));
  }

  label(cell: SkillCell): string {
    if (!cell.loaded) return cell.name;
    const progress = cell.progress === undefined ? '' : `, ${Math.floor(cell.progress)}% to ${cell.level + 1}`;
    return `${cell.name} level ${cell.level}${progress}`;
  }
}
