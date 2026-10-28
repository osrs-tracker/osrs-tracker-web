import { Grid } from '@angular/aria/grid';
import { Directive, effect, inject, viewChild } from '@angular/core';
import { setGridTabStop } from '@app/common/ui/controls/aria-tab-stop';
import { ThemeStore } from '@app/common/theme/theme-store';
import { PlayerView } from '../player-view';
import { hoverCellTint, pickableCellRing, pickedCellBackground, pickedCellRing } from './picked-cell';

/**
 * The grids run to the card's edges, where their inner tone barely differs from the page's: the cells' dividing line
 * also runs round their sides and bottom, as the header above has its own.
 */
@Directive()
export abstract class HiscoresGrid {
  readonly playerView = inject(PlayerView);
  protected readonly darkMode = inject(ThemeStore).darkMode;

  private readonly grid = viewChild(Grid);

  protected readonly tint = pickedCellBackground;
  protected readonly hoverTint = hoverCellTint;
  protected readonly ring = pickedCellRing;
  protected readonly pickableRing = pickableCellRing;

  constructor() {
    effect(() => setGridTabStop(this.grid()));
  }
}
