import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { finalize, Observable, share } from 'rxjs';

/**
 * This interceptor is used to share ongoing requests to reduce the number of unnecessary requests.
 */
@Injectable({
  providedIn: 'root',
})
export class ShareRequestInterceptor implements HttpInterceptor {
  private ongoingRequests = new Map<string, Observable<HttpEvent<any>>>();

  intercept<T>(request: HttpRequest<T>, next: HttpHandler): Observable<HttpEvent<T>> {
    // Do not share non-GET requests
    if (request.method !== 'GET') return next.handle(request);

    const ongoingRequest = this.ongoingRequests.get(request.urlWithParams);
    if (ongoingRequest) return ongoingRequest;

    const sharedRequest = next.handle(request).pipe(
      finalize(() => {
        console.log('finalize', request.urlWithParams);
        this.ongoingRequests.delete(request.urlWithParams);
      }),
      share(),
    );

    this.ongoingRequests.set(request.urlWithParams, sharedRequest);

    return sharedRequest;
  }
}
