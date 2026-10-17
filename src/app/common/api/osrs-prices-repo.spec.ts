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
import { OsrsPricesRepo, TimeSpan } from './osrs-prices-repo';

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
    let week = 0;

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

      // The lists outlive a render: start each test after the previous one's have expired
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(++week * 7 * 86_400_000);
    });

    afterEach(() => vi.useRealTimers());

    it('picks single items from the full list, and hands only those to the browser', () => {
      const prices: number[] = [];
      repo.getLatestPrices(4151).subscribe(price => prices.push(price.high));
      repo.getLatestPrices(561).subscribe(price => prices.push(price.high));

      const req = httpTesting.expectOne(`${config.pricesBaseUrl}/latest`);
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
      httpTesting.expectOne(`${config.pricesBaseUrl}/latest`).flush({ data: { 4151: { high: 1 } } });

      vi.setSystemTime(Date.now() + 59_000);
      let high: number | undefined;
      repo.getLatestPrices(4151).subscribe(price => (high = price.high));
      httpTesting.expectNone(() => true);
      expect(high).toBe(1);

      vi.setSystemTime(Date.now() + 1_000);
      repo.getLatestPrices(4151).subscribe();
      httpTesting.expectOne(`${config.pricesBaseUrl}/latest`);
    });

    it('keeps the mapping, cut down, for every render for 6 hours', () => {
      let names: string[] = [];
      repo.getItemMapping().subscribe(items => (names = items.map(item => item.name)));
      const req = httpTesting.expectOne(`${config.pricesBaseUrl}/mapping`);
      expect(req.request.transferCache).toBe(false);
      req.flush([{ id: 4151, name: 'Abyssal whip', icon: 'Abyssal whip.png', members: true, examine: 'A weapon' }]);
      expect(names).toEqual(['Abyssal whip']);

      vi.setSystemTime(Date.now() + 6 * 3_600_000 - 1);
      let kept: object[] = [];
      repo.getItemMapping().subscribe(items => (kept = items));
      httpTesting.expectNone(() => true);
      expect(kept[0]).not.toHaveProperty('examine');

      vi.setSystemTime(Date.now() + 1);
      repo.getItemMapping().subscribe();
      httpTesting.expectOne(`${config.pricesBaseUrl}/mapping`);
    });

    it('keeps a day of averages until another day is asked for', () => {
      const day = new Date(Date.now() - 86_400_000);
      repo.getAveragePrices(TimeSpan.DAY, day).subscribe();
      const req = httpTesting.expectOne(`${config.pricesBaseUrl}/24h?timestamp=${day.getTime() / 1000}`);
      expect(req.request.transferCache).toBe(false);
      req.flush({ data: { 4151: { highPriceVolume: 1 } }, timestamp: day.getTime() / 1000 });

      vi.setSystemTime(Date.now() + 23 * 3_600_000);
      repo.getAveragePrices(TimeSpan.DAY, day).subscribe();
      httpTesting.expectNone(() => true);

      const nextDay = new Date(day.getTime() + 86_400_000);
      repo.getAveragePrices(TimeSpan.DAY, nextDay).subscribe();
      httpTesting.expectOne(`${config.pricesBaseUrl}/24h?timestamp=${nextDay.getTime() / 1000}`);
    });
  });

  it('shares the mapping, and a day of averages with the item rows, for the session', () => {
    repo.getItemMapping().subscribe();
    repo.getItemMapping().subscribe();
    httpTesting.expectOne(`${config.pricesBaseUrl}/mapping`).flush([]);
    repo.getItemMapping().subscribe();

    const day = new Date(86_400_000);
    repo.getAveragePrices(TimeSpan.DAY, day).subscribe();
    repo.getCachedPriceAverage(4151, TimeSpan.DAY, day).subscribe();
    httpTesting.expectOne(`${config.pricesBaseUrl}/24h?timestamp=86400`).flush({ data: {}, timestamp: 86400 });
    repo.getAveragePrices(TimeSpan.DAY, day).subscribe();
    httpTesting.expectNone(() => true);
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
    httpTesting.expectOne(`${config.pricesBaseUrl}/latest`);
  });
});
