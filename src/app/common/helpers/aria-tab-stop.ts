import { Grid } from '@angular/aria/grid';
import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';

// The only place that reaches into `@angular/aria`'s internal `_pattern`: aria sets a widget's first Tab stop in an
// `afterRenderEffect`, which never runs on the server, and has no public API to choose it. Recheck these on every
// `@angular/aria` update (see docs/decisions.md); the segmented and hiscores grid specs guard them.

/** Makes `widget` the toolbar's Tab stop, and the option the arrow keys start from. */
export function setToolbarTabStop(toolbar: Toolbar, widget: ToolbarWidget): void {
  const activeItem = toolbar._pattern.inputs.activeItem;
  if (activeItem() !== widget._pattern) activeItem.set(widget._pattern);
}

/**
 * Makes the toolbar's first widget its Tab stop when it has none: before the first render (as on the server), or when
 * the widget that was the Tab stop is gone, which the toolbar doesn't notice.
 */
export function ensureToolbarTabStop(toolbar: Toolbar): void {
  const pattern = toolbar._pattern;
  const active = pattern.activeItem();
  if (!active || !pattern.inputs.items().includes(active)) pattern.setDefaultState();
}

/** The toolbar's Tab stop element (a dependency when read in an effect). */
export function toolbarTabStop(toolbar: Toolbar): HTMLElement | undefined {
  return toolbar._pattern.activeItem()?.element();
}

/** Makes the grid's first cell its Tab stop, also during SSR. Call it from an `effect`; once the grid is used, it's a no-op. */
export function setGridTabStop(grid: Grid | undefined): void {
  grid?._pattern.setDefaultStateEffect();
}
