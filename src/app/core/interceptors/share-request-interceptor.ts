import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable, finalize, share } from 'rxjs';

/**
 * Ongoing GET requests, keyed by URL. A service instead of a module-level map, so that concurrent server-side renders
 * (each with their own injector) don't share requests.
 */
@Service()
class OngoingRequests extends Map<string, Observable<HttpEvent<unknown>>> {}

export const shareRequestInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  if (request.method !== 'GET') return next(request);

  const ongoingRequests = inject(OngoingRequests);

  const ongoingRequest = ongoingRequests.get(request.urlWithParams);
  if (ongoingRequest) return ongoingRequest;

  const sharedRequest = next(request).pipe(
    finalize(() => ongoingRequests.delete(request.urlWithParams)),
    share(),
  );

  ongoingRequests.set(request.urlWithParams, sharedRequest);

  return sharedRequest;
};
