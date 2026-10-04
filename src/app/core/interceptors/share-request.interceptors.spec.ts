import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { shareRequestInterceptor } from './share-request.interceptors';

describe('shareRequestInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([shareRequestInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('shares concurrent GET requests for the same URL', () => {
    const results: unknown[] = [];
    http.get('/news', { params: { page: 1 } }).subscribe(res => results.push(res));
    http.get('/news', { params: { page: 1 } }).subscribe(res => results.push(res));

    httpTesting.expectOne('/news?page=1').flush(['news']);

    expect(results).toEqual([['news'], ['news']]);
    httpTesting.verify();
  });

  it('does not share GET requests with different parameters', () => {
    http.get('/news', { params: { page: 1 } }).subscribe();
    http.get('/news', { params: { page: 2 } }).subscribe();

    expect(httpTesting.match(req => req.url === '/news')).toHaveLength(2);
  });

  it('does not share other methods', () => {
    http.post('/players/ToxSick', {}).subscribe();
    http.post('/players/ToxSick', {}).subscribe();

    expect(httpTesting.match('/players/ToxSick')).toHaveLength(2);
  });

  it('sends a new request once the previous one completed', () => {
    http.get('/news').subscribe();
    httpTesting.expectOne('/news').flush([]);

    http.get('/news').subscribe();
    httpTesting.expectOne('/news').flush([]);
  });

  it('sends a new request after the previous one failed, instead of repeating the error', () => {
    let failed = false;
    http.get('/news').subscribe({ error: () => (failed = true) });
    httpTesting.expectOne('/news').flush(null, { status: 503, statusText: 'Service Unavailable' });
    expect(failed).toBe(true);

    let result: unknown;
    http.get('/news').subscribe(res => (result = res));
    httpTesting.expectOne('/news').flush(['news']);
    expect(result).toEqual(['news']);
  });

  it('cancels the shared request only when every subscriber unsubscribed', () => {
    const first = http.get('/news').subscribe();
    http.get('/news').subscribe();
    const req = httpTesting.expectOne('/news');

    first.unsubscribe();
    expect(req.cancelled).toBe(false);
  });
});
