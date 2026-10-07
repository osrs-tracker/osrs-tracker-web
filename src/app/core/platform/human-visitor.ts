import { inject } from '@angular/core';
import { isbot } from 'isbot';
import { WINDOW } from './window.token';

/**
 * Whether this is a person's browser: false during SSR and for crawlers. Lookups and player tracking are only recorded
 * then, as SSR can't tell bots apart. Call it in an injection context.
 */
export function isHumanVisitor(): boolean {
  const window = inject(WINDOW);
  return !!window && !isbot(window.navigator.userAgent);
}
