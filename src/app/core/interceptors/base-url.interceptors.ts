import { HttpContextToken, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiConfig } from 'src/config/api.config';

export const BASE_URL_PREFIX = new HttpContextToken<boolean>(() => true);

@Injectable({
  providedIn: 'root',
})
export class BaseUrlInterceptor<T> implements HttpInterceptor {
  intercept(req: HttpRequest<T>, next: HttpHandler): Observable<HttpEvent<T>> {
    if (!req.context.get(BASE_URL_PREFIX)) return next.handle(req);

    return next.handle(req.clone({ url: apiConfig.baseUrl + req.url }));
  }
}
