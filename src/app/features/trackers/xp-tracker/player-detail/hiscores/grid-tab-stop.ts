import { Grid } from '@angular/aria/grid';

/**
 * Makes the grid's first cell its Tab stop, also during SSR. `@angular/aria` does this in an `afterRenderEffect`, which
 * never runs on the server, so the server HTML had no Tab stop into the grid until hydration. Call it from an `effect`;
 * it does nothing once the grid has been used. Calls the grid's pattern, as aria has no public API for it yet (see
 * docs/decisions.md).
 */
export function setGridTabStop(grid: Grid | undefined): void {
  grid?._pattern.setDefaultStateEffect();
}
