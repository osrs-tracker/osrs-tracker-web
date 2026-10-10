import { HttpContextToken, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { computed, inject, Service, Signal, signal } from '@angular/core';
import { defer, finalize, Observable } from 'rxjs';

@Service()
export class LoadingIndicatorService {
  private readonly ongoingRequests = signal(0);

  readonly hasOngoingRequests: Signal<boolean> = computed(() => this.ongoingRequests() > 0);

  addRequest(): void {
    this.ongoingRequests.update(count => count + 1);
  }

  removeRequest(): void {
    this.ongoingRequests.update(count => count - 1);
  }
}

/** Shows the loading bar at the top of the page while the request runs */
export const LOADING_INDICATOR = new HttpContextToken<boolean>(() => false);

export const loadingIndicatorInterceptor = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  if (!request.context.get(LOADING_INDICATOR)) return next(request);

  const loadingIndicatorService = inject(LoadingIndicatorService);

  // Counted per subscription, so a request that's never subscribed to can't leave the indicator running
  return defer(() => {
    loadingIndicatorService.addRequest();
    return next(request).pipe(finalize(() => loadingIndicatorService.removeRequest()));
  });
};
