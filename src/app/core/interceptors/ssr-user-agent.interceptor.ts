import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';

/** Gives server-side requests a descriptive User-Agent, which the OSRS Wiki prices API asks for */
export const ssrUserAgentInterceptor: HttpInterceptorFn = (req, next) => {
  if (isPlatformBrowser(inject(PLATFORM_ID))) return next(req);
  return next(req.clone({ headers: req.headers.set('User-Agent', 'OSRS Tracker SSR') }));
};
