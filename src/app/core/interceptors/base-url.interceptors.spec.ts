import {
  HttpClient,
  HttpContext,
  provideHttpClient,
  withInterceptors,
  ɵwithHttpTransferCache as withHttpTransferCache,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { makeStateKey, provideZonelessChangeDetection, Provider, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { config } from 'src/config/config';
import { BASE_URL_PREFIX, baseUrlInterceptor, provideInternalApiBaseUrl } from './base-url.interceptors';

const internalOrigin = 'http://osrs-tracker-api-service.osrs-tracker:3000';
const globals = globalThis as { ngServerMode?: boolean };

function setup(...providers: Provider[]): { http: HttpClient; httpTesting: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(withInterceptors([baseUrlInterceptor])),
      provideHttpClientTesting(),
      withHttpTransferCache({}),
      ...providers,
    ],
  });
  return { http: TestBed.inject(HttpClient), httpTesting: TestBed.inject(HttpTestingController) };
}

describe('baseUrlInterceptor', () => {
  afterEach(() => {
    delete globals.ngServerMode;
    TestBed.resetTestingModule();
  });

  it('sends browser requests to the public API URL', () => {
    const { http, httpTesting } = setup();

    http.get('/news').subscribe();

    httpTesting.expectOne(`${config.apiBaseUrl}/news`);
    httpTesting.verify();
  });

  it('sends server requests to the internal API URL when one is set', () => {
    globals.ngServerMode = true;
    const { http, httpTesting } = setup(provideInternalApiBaseUrl(internalOrigin));

    http.get('/news').subscribe();

    httpTesting.expectOne(`${internalOrigin}/news`);
    httpTesting.verify();
  });

  it('leaves requests to other hosts alone', () => {
    globals.ngServerMode = true;
    const { http, httpTesting } = setup(provideInternalApiBaseUrl(internalOrigin));

    http
      .get('https://prices.runescape.wiki/api/v1/osrs/latest', {
        context: new HttpContext().set(BASE_URL_PREFIX, false),
      })
      .subscribe();

    httpTesting.expectOne('https://prices.runescape.wiki/api/v1/osrs/latest');
    httpTesting.verify();
  });

  it('lets the browser reuse responses the server fetched from the internal API URL', () => {
    // Server render: fetch in-cluster and store the response in the transfer state
    globals.ngServerMode = true;
    const server = setup(provideInternalApiBaseUrl(internalOrigin));
    server.http.get('/news', { params: { page: 1 } }).subscribe();
    server.httpTesting.expectOne(`${internalOrigin}/news?page=1`).flush(['news']);
    const state: Record<string, unknown> = JSON.parse(TestBed.inject(TransferState).toJson());
    expect(Object.keys(state)).toHaveLength(1);

    // Hydration: the browser requests the public URL and finds the server's response
    TestBed.resetTestingModule();
    globals.ngServerMode = false;
    const browser = setup();
    const transferState = TestBed.inject(TransferState);
    Object.entries(state).forEach(([key, value]) => transferState.set(makeStateKey(key), value));

    let result: unknown;
    browser.http.get('/news', { params: { page: 1 } }).subscribe(res => (result = res));

    browser.httpTesting.expectNone(() => true);
    expect(result).toEqual(['news']);
  });
});
