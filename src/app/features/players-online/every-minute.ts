import { afterNextRender, DestroyRef, inject } from '@angular/core';
import { WINDOW } from '@app/core/platform/window-token';

const MINUTE = 60_000;

/** Calls `refresh` every minute while the tab is visible, from the first render in the browser until destroyed */
export function everyMinute(refresh: () => void): void {
  const window = inject(WINDOW);
  const destroyRef = inject(DestroyRef);

  afterNextRender(() => {
    if (!window) return;
    const id = window.setInterval(() => !window.document.hidden && refresh(), MINUTE);
    destroyRef.onDestroy(() => window.clearInterval(id));
  });
}
