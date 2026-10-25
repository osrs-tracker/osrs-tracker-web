import { inject } from '@angular/core';
import { isbot } from 'isbot';
import { WINDOW } from './window-token';

/**
 * Lookups and player tracking are only recorded for a person's browser, as SSR can't tell bots apart. Call it in an
 * injection context.
 */
export function isHumanVisitor(): boolean {
  const window = inject(WINDOW);
  return !!window && !isbot(window.navigator.userAgent);
}
