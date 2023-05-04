import { HttpContextToken, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { config } from 'src/config/config';

export const BASE_URL_PREFIX = new HttpContextToken<boolean>(() => true);

export const baseUrlInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  if (!request.context.get(BASE_URL_PREFIX)) return next(request);

  return next(request.clone({ url: config.apiBaseUrl + request.url }));
};
