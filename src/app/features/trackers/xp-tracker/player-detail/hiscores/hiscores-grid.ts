import { Grid } from '@angular/aria/grid';
import { Directive, effect, inject, viewChild } from '@angular/core';
import { setGridTabStop } from '@app/common/ui/controls/aria-tab-stop';
import { ThemeStore } from '@app/common/theme/theme-store';
import { PlayerView } from '../player-view';
import { pickableCellRing, pickedCellBackground, pickedCellRing } from './picked-cell';

/** The skills and activities grids: cells that pick what the charts show, in an `@angular/aria` grid */
@Directive()
export abstract class HiscoresGrid {
  readonly playerView = inject(PlayerView);
  protected readonly darkMode = inject(ThemeStore).darkMode;

  private readonly grid = viewChild(Grid);

  protected readonly tint = pickedCellBackground;
  protected readonly ring = pickedCellRing;
  protected readonly pickableRing = pickableCellRing;

  constructor() {
    effect(() => setGridTabStop(this.grid()));
  }
}
