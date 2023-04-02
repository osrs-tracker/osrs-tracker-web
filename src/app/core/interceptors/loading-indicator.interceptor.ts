import { HttpContextToken, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
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

@Injectable()
export class LoadingIndicatorInterceptor<T> implements HttpInterceptor {
  constructor(private loadingIndicatorService: LoadingIndicatorService<T>) {}

  intercept(request: HttpRequest<T>, next: HttpHandler): Observable<HttpEvent<T>> {
    if (!request.context.get(LOADING_INDICATOR)) return next.handle(request);

    const requestId = crypto.randomUUID();
    const ongoingRequest = next
      .handle(request)
      .pipe(finalize(() => this.loadingIndicatorService.removeRequest(requestId)));
    this.loadingIndicatorService.addRequest(requestId, ongoingRequest);

    return ongoingRequest;
  }
}
