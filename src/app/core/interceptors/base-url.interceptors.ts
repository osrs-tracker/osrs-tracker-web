import {
  HTTP_TRANSFER_CACHE_ORIGIN_MAP,
  HttpContextToken,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject, InjectionToken, Provider } from '@angular/core';
import { Observable } from 'rxjs';
import { config } from 'src/config/config';

/** Prefixes the request URL with the API base URL. Set to `false` for requests to other hosts. */
export const BASE_URL_PREFIX = new HttpContextToken<boolean>(() => true);

/** The API origin that `HttpClient` requests go to: the public URL, unless the server calls the API in-cluster. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', { factory: () => config.apiBaseUrl });

/**
 * Server only: sends API requests to `internalOrigin` instead of the public URL. The transfer cache stores the
 * responses under the public URL, which the browser requests, so it doesn't fetch them again after hydration. Angular
 * throws if the origin map is provided in the browser.
 */
export function provideInternalApiBaseUrl(internalOrigin: string): Provider[] {
  return [
    { provide: API_BASE_URL, useValue: internalOrigin },
    { provide: HTTP_TRANSFER_CACHE_ORIGIN_MAP, useValue: { [internalOrigin]: config.apiBaseUrl } },
  ];
}

export const baseUrlInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  if (!request.context.get(BASE_URL_PREFIX)) return next(request);

  return next(request.clone({ url: inject(API_BASE_URL) + request.url }));
};
