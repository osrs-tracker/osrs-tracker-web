import { ViewportScroller } from '@angular/common';
import { inject } from '@angular/core';
import { WINDOW } from '@app/core/platform/window-token';

/**
 * The router scrolls to a link's fragment with `window.scrollTo`, which ignores the page's `scroll-padding-top` (clear
 * of the sticky nav, `base.css`), so the target would end up under the nav: give it the same offset. Read on each
 * scroll, as it's 0 on phones, where the nav scrolls away.
 */
export function alignAnchorScrolling(): void {
  const window = inject(WINDOW);
  if (!window) return;

  inject(ViewportScroller).setOffset(() => [
    0,
    parseFloat(window.getComputedStyle(window.document.documentElement).scrollPaddingTop) || 0,
  ]);
}
