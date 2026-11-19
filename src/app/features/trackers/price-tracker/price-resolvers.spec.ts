import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { PRICE_WORLD, PriceWorld } from '@app/common/api/price-world';
import { browseItemsResolver } from './browse/browse-items-resolver';
import { itemDetailResolver } from './item-detail/item-detail-resolver';

@Component({ template: '' })
class PageComponent {}

describe('price tracker resolvers on a failed load', () => {
  function addressBarAfterError(world: PriceWorld, resolve: () => Observable<unknown>): Promise<string> {
    const failed = () => throwError(() => new HttpErrorResponse({ status: 500 }));
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLocationMocks(),
        provideRouter([{ path: '**', component: PageComponent }]),
        { provide: PRICE_WORLD, useValue: world },
        { provide: OsrsTrackerRepo, useValue: { getItemInfo: failed, getItemsByLetter: failed } },
      ],
    });
    TestBed.runInInjectionContext(() => resolve().subscribe({ error: () => undefined }));

    return new Promise(done => setTimeout(() => done(TestBed.inject(Location).path())));
  }

  const route = (params: Record<string, string>) => ({ params }) as unknown as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  it.each([
    ['main', '/trackers/price/4151'],
    ['hardcore', '/trackers/price/hardcore/4151'],
  ] as const)('keeps the %s item page in the address bar', async (world, url) => {
    const resolve = () => itemDetailResolver(route({ id: '4151' }), state) as Observable<unknown>;
    expect(await addressBarAfterError(world, resolve)).toBe(url);
  });

  it.each([
    ['main', '/trackers/price/browse/a'],
    ['hardcore', '/trackers/price/hardcore/browse/a'],
  ] as const)('keeps the %s browse page in the address bar', async (world, url) => {
    const resolve = () => browseItemsResolver(route({ letter: 'a' }), state) as Observable<unknown>;
    expect(await addressBarAfterError(world, resolve)).toBe(url);
  });
});
