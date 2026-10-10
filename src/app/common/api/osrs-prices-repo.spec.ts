import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ApplicationRef,
  makeStateKey,
  PLATFORM_ID,
  provideZonelessChangeDetection,
  TransferState,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SSR_TIMEOUT } from '@app/core/interceptors/ssr-timeout-interceptor';
import { config } from '@config/config';
import { OsrsPricesRepo } from './osrs-prices-repo';

describe('OsrsPricesRepo', () => {
  let repo: OsrsPricesRepo;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(OsrsPricesRepo);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  // A single item (`?id=`) rarely is in the Wiki's CDN cache, and took over 2 s at the 90th percentile during SSR
  describe('on the server', () => {
    let hour = 0;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      repo = TestBed.inject(OsrsPricesRepo);
      httpTesting = TestBed.inject(HttpTestingController);

      // The list outlives a render: start each test after the previous one's has expired
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(++hour * 3_600_000);
    });

    afterEach(() => vi.useRealTimers());

    it('picks single items from the full list, and hands only those to the browser', () => {
      const prices: number[] = [];
      repo.getLatestPrices(4151).subscribe(price => prices.push(price.high));
      repo.getLatestPrices(561).subscribe(price => prices.push(price.high));

      const req = httpTesting.expectOne(`${config.pricesBaseUrl}/api/v1/osrs/latest`);
      expect(req.request.transferCache).toBe(false);
      expect(req.request.context.get(SSR_TIMEOUT)).toBe(true);
      req.flush({ data: { 4151: { high: 1_500_000 }, 561: { high: 100 }, 995: { high: 1 } } });

      expect(prices).toEqual([1_500_000, 100]);
      const transferState = TestBed.inject(TransferState);
      expect(transferState.get(makeStateKey<object | null>('wiki-latest-4151'), null)).toEqual({ high: 1_500_000 });
      expect(transferState.hasKey(makeStateKey<object | null>('wiki-latest-995'))).toBe(false);
    });

    it('keeps the full list for every render for 60 seconds', () => {
      repo.getLatestPrices(4151).subscribe();
      httpTesting.expectOne(`${config.pricesBaseUrl}/api/v1/osrs/latest`).flush({ data: { 4151: { high: 1 } } });

      vi.setSystemTime(Date.now() + 59_000);
      let high: number | undefined;
      repo.getLatestPrices(4151).subscribe(price => (high = price.high));
      httpTesting.expectNone(() => true);
      expect(high).toBe(1);

      vi.setSystemTime(Date.now() + 1_000);
      repo.getLatestPrices(4151).subscribe();
      httpTesting.expectOne(`${config.pricesBaseUrl}/api/v1/osrs/latest`);
    });
  });

  it("uses the server's price for an item until the app is stable", async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(TransferState).set(makeStateKey<object | null>('wiki-latest-4151'), { high: 1_500_000 });
    repo = TestBed.inject(OsrsPricesRepo);
    httpTesting = TestBed.inject(HttpTestingController);

    let high: number | undefined;
    repo.getLatestPrices(4151).subscribe(price => (high = price.high));
    httpTesting.expectNone(() => true);
    expect(high).toBe(1_500_000);

    await TestBed.inject(ApplicationRef).whenStable();
    repo.getLatestPrices(4151).subscribe();
    httpTesting.expectOne(`${config.pricesBaseUrl}/api/v1/osrs/latest`);
  });
});
