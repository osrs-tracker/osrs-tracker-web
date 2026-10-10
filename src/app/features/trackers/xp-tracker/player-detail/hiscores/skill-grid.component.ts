import { Grid, GridCell, GridCellWidget, GridRow } from '@angular/aria/grid';
import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, input, InputSignal, Signal, viewChild } from '@angular/core';
import { calculateXPForSkillLevel, SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreEntry, HiscoreSkill, overallOf, skillLevel } from '@osrs-tracker/models';
import { SkeletonComponent } from 'src/app/common/components/general/skeleton.component';
import { TooltipComponent } from 'src/app/common/components/general/tooltip/tooltip.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { setGridTabStop } from 'src/app/common/helpers/aria-tab-stop';
import { ThemeService } from 'src/app/common/services/theme.service';
import { ChartSkill, SKILL_COLORS } from '../../skill-colors';
import { percentageToNextLevel } from '../../skill-progress';
import { PlayerView } from '../player-view';
import { pickedCellBackground, pickedCellRing } from './picked-cell';

// The in-game skill grid, read row by row; the total level follows across the full width
const SKILL_LAYOUT: SkillEnum[] = [
  ...[SkillEnum.Attack, SkillEnum.Hitpoints, SkillEnum.Mining],
  ...[SkillEnum.Strength, SkillEnum.Agility, SkillEnum.Smithing],
  ...[SkillEnum.Defence, SkillEnum.Herblore, SkillEnum.Fishing],
  ...[SkillEnum.Ranged, SkillEnum.Thieving, SkillEnum.Cooking],
  ...[SkillEnum.Prayer, SkillEnum.Crafting, SkillEnum.Firemaking],
  ...[SkillEnum.Magic, SkillEnum.Fletching, SkillEnum.Woodcutting],
  ...[SkillEnum.Runecraft, SkillEnum.Slayer, SkillEnum.Farming],
  ...[SkillEnum.Construction, SkillEnum.Hunter, SkillEnum.Sailing],
];

interface SkillCell {
  name: SkillEnum;
  /** False while the hiscores load; the cell is a skeleton */
  loaded: boolean;
  /** `null` for an untrained skill, which shows level 1 */
  skill: HiscoreSkill | null;
  level: number;
  /** XP shown and used for progress; an untrained skill has none */
  xp: number;
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
                [style.box-shadow]="
                  cell.charted
                    ? cell.on
                      ? ring(cell.color)
                      : 'inset 0 0 0 1px color-mix(in oklch, ' + cell.color + ' 45%, transparent)'
                    : null
                "
                [attr.aria-disabled]="!cell.charted"
                [attr.aria-pressed]="cell.charted ? cell.on : null"
                [attr.aria-label]="label(cell)"
                [tooltip]="cell.loaded"
                [tooltipTemplate]="tooltipTemplate"
                [tooltipUnderline]="false"
                (click)="cell.charted && playerView.toggleSkill(cell.name)"
              >
                <span class="flex items-center justify-between h-9.25 pt-1.75 pb-1.5 px-3">
                  @if (cell.loaded) {
                    <img class="h-6 w-auto" icon [name]="cell.name" [skill]="true" />
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
                    <div>{{ xpForNextLevel(cell.level) | number }}</div>
                    <div>{{ xpForNextLevel(cell.level) - cell.xp | number }}</div>
                  }
                </div>
              </div>
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
              <img class="h-5.5 w-auto" icon [name]="SkillEnum.Overall" [skill]="true" />
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
  imports: [DecimalPipe, Grid, GridCell, GridCellWidget, GridRow, IconDirective, SkeletonComponent, TooltipComponent],
})
export class SkillGridComponent {
  readonly playerView = inject(PlayerView);
  private readonly darkMode = inject(ThemeService).darkMode;

  readonly SkillEnum: typeof SkillEnum = SkillEnum;
  readonly OVERALL_COLOR: string = OVERALL_COLOR;

  /** Undefined while the hiscores load */
  readonly hiscore: InputSignal<HiscoreEntry | undefined> = input.required();
  /** Each skill's XP gained over the charted days */
  readonly gains: InputSignal<ReadonlyMap<string, number>> = input.required();

  readonly cells: Signal<SkillCell[]> = computed(() => {
    const selected = this.playerView.skills();
    const theme = this.darkMode() ? 'dark' : 'light';
    return SKILL_LAYOUT.map(name => {
      const hiscore = this.hiscore();
      const loaded = !!hiscore;
      const skill = hiscore?.skills[name] ?? null;
      const level = skillLevel(skill);
      const xp = skill?.xp ?? 0;
      const gain = this.gains().get(name) ?? 0;
      return {
        name,
        loaded,
        skill,
        level,
        xp,
        progress: loaded && level < 99 ? percentageToNextLevel(xp, level) : undefined,
        gain,
        charted: loaded && gain > 0,
        on: selected.has(name),
        color: SKILL_COLORS[name as ChartSkill][theme],
      };
    });
  });
  /** The cells in rows of three, as the grid reads them */
  readonly rows: Signal<SkillCell[][]> = computed(() => {
    const cells = this.cells();
    return Array.from({ length: Math.ceil(cells.length / 3) }, (_, i) => cells.slice(i * 3, i * 3 + 3));
  });
  readonly overall: Signal<HiscoreSkill | undefined> = computed(() => {
    const hiscore = this.hiscore();
    return hiscore && overallOf(hiscore);
  });
  readonly overallOn: Signal<boolean> = computed(() => this.playerView.skills().has(SkillEnum.Overall));

  private readonly grid: Signal<Grid | undefined> = viewChild(Grid);

  constructor() {
    effect(() => setGridTabStop(this.grid()));
  }

  /** A picked cell's background, as in the activity grid */
  tint(color: string): string {
    return pickedCellBackground(color);
  }

  /** A picked cell's outline, as in the activity grid */
  ring(color: string): string {
    return pickedCellRing(color);
  }

  xpForNextLevel(level: number): number {
    return calculateXPForSkillLevel(level + 1);
  }

  label(cell: SkillCell): string {
    if (!cell.loaded) return cell.name;
    const progress = cell.progress === undefined ? '' : `, ${Math.floor(cell.progress)}% to ${cell.level + 1}`;
    return `${cell.name} level ${cell.level}${progress}`;
  }
}
