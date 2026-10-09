import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { provideSsrRequestTimeout, SSR_TIMEOUT, ssrTimeoutInterceptor } from './ssr-timeout.interceptor';

function setup(...providers: Provider[]): { http: HttpClient; httpTesting: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(withInterceptors([ssrTimeoutInterceptor])),
      provideHttpClientTesting(),
      ...providers,
    ],
  });
  return { http: TestBed.inject(HttpClient), httpTesting: TestBed.inject(HttpTestingController) };
}

const withSsrTimeout = { context: new HttpContext().set(SSR_TIMEOUT, true) };

// The backend enforces the timeout, which the testing backend doesn't simulate: these check the request it gets.
describe('ssrTimeoutInterceptor', () => {
  it('gives server requests with SSR_TIMEOUT the timeout', () => {
    const { http, httpTesting } = setup(provideSsrRequestTimeout(3000));
    http.get('/latest', withSsrTimeout).subscribe();

    expect(httpTesting.expectOne('/latest').request.timeout).toBe(3000);
  });

  it('leaves server requests without SSR_TIMEOUT alone', () => {
    const { http, httpTesting } = setup(provideSsrRequestTimeout(3000));
    http.get('/players/ToxSick').subscribe();

    expect(httpTesting.expectOne('/players/ToxSick').request.timeout).toBeUndefined();
  });

  it('sets no timeout without one configured (the browser)', () => {
    const { http, httpTesting } = setup();
    http.get('/latest', withSsrTimeout).subscribe();

    expect(httpTesting.expectOne('/latest').request.timeout).toBeUndefined();
  });
});
