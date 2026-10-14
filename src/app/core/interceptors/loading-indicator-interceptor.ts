import { HttpContextToken, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { defer, finalize, Observable } from 'rxjs';

/** The requests the loading bar waits for */
export const LoadingIndicatorStore = signalStore(
  { providedIn: 'root' },
  withState({ _ongoingRequests: 0 }),
  withComputed(({ _ongoingRequests }) => ({
    hasOngoingRequests: computed<boolean>(() => _ongoingRequests() > 0),
  })),
  withMethods(store => ({
    addRequest(): void {
      patchState(store, ({ _ongoingRequests }) => ({ _ongoingRequests: _ongoingRequests + 1 }));
    },

    removeRequest(): void {
      patchState(store, ({ _ongoingRequests }) => ({ _ongoingRequests: _ongoingRequests - 1 }));
    },
  })),
);

/** Shows the loading bar at the top of the page while the request runs */
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
