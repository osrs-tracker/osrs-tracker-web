import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';

/** Gives server-side requests a User-Agent naming the site, as the OSRS Wiki prices API asks */
export const ssrUserAgentInterceptor: HttpInterceptorFn = (req, next) => {
  if (isPlatformBrowser(inject(PLATFORM_ID))) return next(req);
  return next(
    req.clone({ headers: req.headers.set('User-Agent', 'OSRS Tracker SSR - https://osrs-tracker.freekmencke.com') }),
  );
};
