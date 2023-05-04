import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Observable, finalize, share } from 'rxjs';

const ongoingRequests = new Map<string, Observable<HttpEvent<unknown>>>();

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * This interceptor is used to share ongoing requests to reduce the number of unnecessary requests.
 */
export const shareRequestInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  // Do not share non-GET requests
  if (request.method !== 'GET') return next(request);

  const ongoingRequest = ongoingRequests.get(request.urlWithParams);
  if (ongoingRequest) return ongoingRequest;

  const sharedRequest = next(request).pipe(
    finalize(() => ongoingRequests.delete(request.urlWithParams)),
    share(),
  );

  ongoingRequests.set(request.urlWithParams, sharedRequest);

  return sharedRequest;
};
