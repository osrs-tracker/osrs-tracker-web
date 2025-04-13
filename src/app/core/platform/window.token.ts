import { isPlatformBrowser } from '@angular/common';
import { InjectionToken, PLATFORM_ID, inject } from '@angular/core';

export const WINDOW = new InjectionToken<Window | null>(
  'An abstraction over global window object for SSR compatibility',
  {
    providedIn: 'root',
    factory: () => (isPlatformBrowser(inject(PLATFORM_ID)) ? window : null),
  },
);
