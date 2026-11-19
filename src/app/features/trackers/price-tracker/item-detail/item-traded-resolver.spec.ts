import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { LatestPrices, OsrsPricesRepo } from '@app/common/api/osrs-prices-repo';
import { PRICE_WORLD } from '@app/common/api/price-world';
import { itemTradedResolver } from './item-traded-resolver';

describe('itemTradedResolver', () => {
  const latest = (prices: Partial<LatestPrices>) => of(prices as LatestPrices);

  function resolve(getLatestPrices: () => Observable<LatestPrices>): Promise<boolean> {
    const spy = vi.fn(getLatestPrices);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PRICE_WORLD, useValue: 'hardcore' },
        { provide: OsrsPricesRepo, useValue: { getLatestPrices: spy } },
      ],
    });
    const route = { params: { id: '4151' } } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() =>
      firstValueFrom(itemTradedResolver(route, {} as RouterStateSnapshot) as Observable<boolean>),
    ).finally(() => expect(spy).toHaveBeenCalledWith(4151, 'hardcore'));
  }

  it.each([{ high: 7_000_000 }, { low: 6_800_000 }])('is true when the world has a trade for the item: %o', async p => {
    expect(await resolve(() => latest(p))).toBe(true);
  });

  it('is false when the world has none', async () => {
    expect(await resolve(() => latest({ high: undefined, low: undefined }))).toBe(false);
  });

  it('counts a failed load as traded, so an outage leaves the page indexable', async () => {
    expect(await resolve(() => throwError(() => new Error('down')))).toBe(true);
  });
});
