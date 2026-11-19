import { PLATFORM_ID, TransferState, makeStateKey, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { LatestPrices, OsrsPricesRepo } from '@app/common/api/osrs-prices-repo';
import { PRICE_WORLD } from '@app/common/api/price-world';
import { itemTradedResolver } from './item-traded-resolver';

describe('itemTradedResolver', () => {
  const latest = (prices: Partial<LatestPrices>) => of(prices as LatestPrices);
  const tradedKey = (id: number) => makeStateKey<boolean>(`hardcore-item-traded-${id}`);

  function resolve(
    getLatestPrices: () => Observable<LatestPrices>,
    platform = 'server',
    { id = 4151, transferred }: { id?: number; transferred?: Record<number, boolean> } = {},
  ): Promise<boolean> {
    const spy = vi.fn(getLatestPrices);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: PRICE_WORLD, useValue: 'hardcore' },
        { provide: OsrsPricesRepo, useValue: { getLatestPrices: spy } },
      ],
    });
    for (const [itemId, traded] of Object.entries(transferred ?? {}))
      TestBed.inject(TransferState).set(tradedKey(Number(itemId)), traded);
    const route = { params: { id: String(id) } } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() =>
      firstValueFrom(itemTradedResolver(route, {} as RouterStateSnapshot) as Observable<boolean>),
    ).finally(() => {
      if (platform === 'server') expect(spy).toHaveBeenCalledWith(id, 'hardcore');
      else expect(spy).not.toHaveBeenCalled();
    });
  }

  const stored = (id = 4151) => TestBed.inject(TransferState).get(tradedKey(id), null);

  it('is true when the world has an instant sell for the item', async () => {
    expect(await resolve(() => latest({ low: 6_800_000 }))).toBe(true);
  });

  it('is true when the world only has an instant buy for the item', async () => {
    expect(await resolve(() => latest({ high: 7_000_000, low: undefined }))).toBe(true);
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

  describe('hands the server’s answer to the browser', () => {
    it('stores false on the server for an item without a trade', async () => {
      await resolve(() => latest({ high: undefined, low: undefined }), 'server', { id: 10039 });
      expect(stored(10039)).toBe(false);
    });

    it('stores true on the server for a traded item', async () => {
      await resolve(() => latest({ low: 6_800_000 }));
      expect(stored()).toBe(true);
    });

    it('stores true on the server when the load fails', async () => {
      await resolve(() => throwError(() => new Error('down')));
      expect(stored()).toBe(true);
    });

    it('resolves the transferred false in the browser, so hydration keeps noindex', async () => {
      expect(await resolve(() => latest({}), 'browser', { id: 10039, transferred: { 10039: false } })).toBe(false);
    });

    it('resolves true in the browser for another item than the transferred one', async () => {
      expect(await resolve(() => latest({}), 'browser', { id: 4151, transferred: { 10039: false } })).toBe(true);
    });
  });
});
