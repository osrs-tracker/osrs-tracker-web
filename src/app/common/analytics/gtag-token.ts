import { isPlatformBrowser } from '@angular/common';
import { inject, InjectionToken, PLATFORM_ID } from '@angular/core';

export const GTAG_TOKEN = new InjectionToken<Gtag.Gtag | null>('GtagToken', {
  providedIn: 'root',
  factory: () => (isPlatformBrowser(inject(PLATFORM_ID)) ? gtag : null),
});
