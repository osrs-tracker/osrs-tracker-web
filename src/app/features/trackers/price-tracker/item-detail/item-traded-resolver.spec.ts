import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { LatestPrices, OsrsPricesRepo } from '@app/common/api/osrs-prices-repo';
import { PRICE_WORLD } from '@app/common/api/price-world';
import { itemTradedResolver } from './item-traded-resolver';

describe('itemTradedResolver', () => {
  const latest = (prices: Partial<LatestPrices>) => of(prices as LatestPrices);

  function resolve(getLatestPrices: () => Observable<LatestPrices>, platform = 'server'): Promise<boolean> {
    const spy = vi.fn(getLatestPrices);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: PRICE_WORLD, useValue: 'hardcore' },
        { provide: OsrsPricesRepo, useValue: { getLatestPrices: spy } },
      ],
    });
    const route = { params: { id: '4151' } } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() =>
      firstValueFrom(itemTradedResolver(route, {} as RouterStateSnapshot) as Observable<boolean>),
    ).finally(() => {
      if (platform === 'server') expect(spy).toHaveBeenCalledWith(4151, 'hardcore');
      else expect(spy).not.toHaveBeenCalled();
    });
  }

  it('is true when the world has an instant sell for the item', async () => {
    expect(await resolve(() => latest({ low: 6_800_000 }))).toBe(true);
  });

  it('is false when the world has none, as the price tile shows a dash', async () => {
    expect(await resolve(() => latest({ high: 7_000_000, low: undefined }))).toBe(false);
  });

  it('is false when the world has no trade at all', async () => {
    expect(await resolve(() => latest({ high: undefined, low: undefined }))).toBe(false);
  });

  it('counts a failed load as traded, so an outage leaves the page indexable', async () => {
    expect(await resolve(() => throwError(() => new Error('down')))).toBe(true);
  });

  it('resolves at once in the browser, without loading the list', async () => {
    expect(await resolve(() => latest({}), 'browser')).toBe(true);
  });
});
