import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter, Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { resolverErrorHandler } from './resolver-error';

@Component({ template: '' })
class PageComponent {}

describe('resolverErrorHandler', () => {
  const url = '/trackers/xp/ToxSick';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLocationMocks(),
        provideRouter([
          { path: 'error', component: PageComponent },
          { path: '**', component: PageComponent },
        ]),
      ],
    });
  });

  /** Fails a resolver with `err` and waits for the navigation it starts */
  async function failWith(err: unknown): Promise<{ routerUrl: string; addressBar: string; rethrown: unknown }> {
    let rethrown: unknown;
    TestBed.runInInjectionContext(() =>
      throwError(() => err)
        .pipe(catchError(resolverErrorHandler(url)))
        .subscribe({ error: e => (rethrown = e) }),
    );
    await new Promise(resolve => setTimeout(resolve));

    return { routerUrl: TestBed.inject(Router).url, addressBar: TestBed.inject(Location).path(), rethrown };
  }

  it.each([400, 404])('shows the not-found page for a %s, keeping the URL', async status => {
    const err = new HttpErrorResponse({ status });
    expect(await failWith(err)).toEqual({ routerUrl: '/**', addressBar: url, rethrown: err });
  });

  it.each([500, 503, 0])('shows the error page for a %s, keeping the URL', async status => {
    const err = new HttpErrorResponse({ status });
    expect(await failWith(err)).toEqual({ routerUrl: '/error', addressBar: url, rethrown: err });
  });

  it('shows the error page for a non-HTTP error', async () => {
    const err = new TypeError('boom');
    expect(await failWith(err)).toEqual({ routerUrl: '/error', addressBar: url, rethrown: err });
  });
});
