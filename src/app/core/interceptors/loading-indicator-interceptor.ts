import { HttpContextToken, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { defer, finalize, Observable } from 'rxjs';
import { LoadingIndicatorStore } from './loading-indicator-store';

export const LOADING_INDICATOR = new HttpContextToken<boolean>(() => false);

export const loadingIndicatorInterceptor = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  if (!request.context.get(LOADING_INDICATOR)) return next(request);

  const loadingIndicatorStore = inject(LoadingIndicatorStore);

  // Counted per subscription, so a request that's never subscribed to can't leave the indicator running
  return defer(() => {
    loadingIndicatorStore.addRequest();
    return next(request).pipe(finalize(() => loadingIndicatorStore.removeRequest()));
  });
};
