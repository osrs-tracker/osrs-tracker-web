import { HttpContextToken, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, finalize, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoadingIndicatorService<T> {
  private ongoingRequests$ = new BehaviorSubject(new Map<string, Observable<HttpEvent<T>>>());

  get hasOngoingRequests(): Observable<boolean> {
    return this.ongoingRequests$.asObservable().pipe(map(ongoingRequests => ongoingRequests.size > 0));
  }

  addRequest(requestId: string, request: Observable<HttpEvent<T>>) {
    const ongoingRequests = new Map(this.ongoingRequests$.value);
    ongoingRequests.set(requestId, request);
    this.ongoingRequests$.next(ongoingRequests);
  }

  removeRequest(requestId: string) {
    const ongoingRequests = new Map(this.ongoingRequests$.value);
    ongoingRequests.delete(requestId);
    this.ongoingRequests$.next(ongoingRequests);
  }
}

export const LOADING_INDICATOR = new HttpContextToken<boolean>(() => false);

export const loadingIndicatorInterceptor = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  if (!request.context.get(LOADING_INDICATOR)) return next(request);

  const loadingIndicatorService = inject(LoadingIndicatorService);

  const requestId = crypto.randomUUID();
  const ongoingRequest = next(request).pipe(finalize(() => loadingIndicatorService.removeRequest(requestId)));
  loadingIndicatorService.addRequest(requestId, ongoingRequest);

  return ongoingRequest;
};
