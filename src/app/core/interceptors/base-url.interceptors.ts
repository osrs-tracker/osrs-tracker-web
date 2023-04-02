import { HttpContextToken, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { config } from 'src/config/config';

export const BASE_URL_PREFIX = new HttpContextToken<boolean>(() => true);

@Injectable()
export class BaseUrlInterceptor<T> implements HttpInterceptor {
  intercept(request: HttpRequest<T>, next: HttpHandler): Observable<HttpEvent<T>> {
    if (!request.context.get(BASE_URL_PREFIX)) return next.handle(request);

    return next.handle(request.clone({ url: config.apiBaseUrl + request.url }));
  }
}
