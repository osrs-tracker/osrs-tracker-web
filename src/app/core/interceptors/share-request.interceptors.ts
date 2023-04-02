import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, finalize, share } from 'rxjs';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * This interceptor is used to share ongoing requests to reduce the number of unnecessary requests.
 */
@Injectable()
export class ShareRequestInterceptor<T> implements HttpInterceptor {
  private ongoingRequests = new Map<string, Observable<HttpEvent<T>>>();

  intercept(request: HttpRequest<T>, next: HttpHandler): Observable<HttpEvent<T>> {
    // Do not share non-GET requests
    if (request.method !== 'GET') return next.handle(request);

    const ongoingRequest = this.ongoingRequests.get(request.urlWithParams);
    if (ongoingRequest) return ongoingRequest;

    const sharedRequest = next.handle(request).pipe(
      finalize(() => this.ongoingRequests.delete(request.urlWithParams)),
      share(),
    );

    this.ongoingRequests.set(request.urlWithParams, sharedRequest);

    return sharedRequest;
  }
}
