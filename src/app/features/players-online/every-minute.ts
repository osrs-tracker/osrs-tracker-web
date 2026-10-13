import { afterNextRender, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, interval } from 'rxjs';
import { WINDOW } from '@app/core/platform/window-token';

const MINUTE = 60_000;

/** Calls `refresh` every minute while the tab is visible, from the first render in the browser until destroyed */
export function everyMinute(refresh: () => void): void {
  const window = inject(WINDOW);
  const destroyRef = inject(DestroyRef);

  afterNextRender(() =>
    interval(MINUTE)
      .pipe(
        filter(() => !window?.document.hidden),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(refresh),
  );
}
