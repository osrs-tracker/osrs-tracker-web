import { HttpContextToken, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject, InjectionToken, Provider } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Lets the request fail after `SSR_REQUEST_TIMEOUT` during server rendering. For third-party calls that can stall (the
 * OSRS Wiki) and whose failure the page renders as loading on the server, so the browser fetches them after hydration.
 */
export const SSR_TIMEOUT = new HttpContextToken<boolean>(() => false);

/** How long a request with `SSR_TIMEOUT` may take during a server render, in ms. Unset in the browser. */
export const SSR_REQUEST_TIMEOUT = new InjectionToken<number | undefined>('SSR_REQUEST_TIMEOUT', {
  factory: () => undefined,
});

/** Server only: requests with `SSR_TIMEOUT` fail after `ms`, so a slow third party can't hold up the render. */
export function provideSsrRequestTimeout(ms: number): Provider {
  return { provide: SSR_REQUEST_TIMEOUT, useValue: ms };
}

/**
 * Gives requests with `SSR_TIMEOUT` the `SSR_REQUEST_TIMEOUT` as their `timeout`: the backend then aborts the `fetch`
 * (logged as `aborted`) and fails the request with status 0. Failed responses aren't in the transfer cache, so the
 * browser fetches them again after hydration.
 */
export const ssrTimeoutInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const ms = inject(SSR_REQUEST_TIMEOUT);
  if (ms === undefined || !request.context.get(SSR_TIMEOUT)) return next(request);

  return next(request.clone({ timeout: ms }));
};
