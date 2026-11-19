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

      const req = httpTesting.expectOne(`${config.pricesBaseUrl.main}/latest`);
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
      httpTesting.expectOne(`${config.pricesBaseUrl.main}/latest`).flush({ data: { 4151: { high: 1 } } });

      vi.setSystemTime(Date.now() + 59_000);
      let high: number | undefined;
      repo.getLatestPrices(4151).subscribe(price => (high = price.high));
      httpTesting.expectNone(() => true);
      expect(high).toBe(1);

      vi.setSystemTime(Date.now() + 1_000);
      repo.getLatestPrices(4151).subscribe();
      httpTesting.expectOne(`${config.pricesBaseUrl.main}/latest`);
    });

    it('keeps the mapping, cut down, for every render for 6 hours', () => {
      let names: string[] = [];
      repo.getItemMapping().subscribe(items => (names = items.map(item => item.name)));
      const req = httpTesting.expectOne(`${config.pricesBaseUrl.main}/mapping`);
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
      httpTesting.expectOne(`${config.pricesBaseUrl.main}/mapping`);
    });

    it('keeps a day of averages until another day is asked for', () => {
      const day = new Date(Date.now() - 86_400_000);
      repo.getAveragePrices(TimeSpan.DAY, day).subscribe();
      const req = httpTesting.expectOne(`${config.pricesBaseUrl.main}/24h?timestamp=${day.getTime() / 1000}`);
      expect(req.request.transferCache).toBe(false);
      req.flush({ data: { 4151: { highPriceVolume: 1 } }, timestamp: day.getTime() / 1000 });

      vi.setSystemTime(Date.now() + 23 * 3_600_000);
      repo.getAveragePrices(TimeSpan.DAY, day).subscribe();
      httpTesting.expectNone(() => true);

      const nextDay = new Date(day.getTime() + 86_400_000);
      repo.getAveragePrices(TimeSpan.DAY, nextDay).subscribe();
      httpTesting.expectOne(`${config.pricesBaseUrl.main}/24h?timestamp=${nextDay.getTime() / 1000}`);
    });
    describe('for Hardcore Worlds', () => {
      const main = `${config.pricesBaseUrl.main}`;
      const hardcore = 'https://prices.runescape.wiki/api/v2/osrs-hc';

      it('asks the Hardcore Worlds API, and does not answer with the main list kept for the same item', () => {
        let mainHigh: number | undefined;
        repo.getLatestPrices(4151).subscribe(price => (mainHigh = price.high));
        httpTesting.expectOne(`${main}/latest`).flush({ data: { 4151: { high: 1_500_000 } } });
        expect(mainHigh).toBe(1_500_000);

        let hardcoreHigh: number | undefined;
        repo.getLatestPrices(4151, 'hardcore').subscribe(price => (hardcoreHigh = price.high));
        httpTesting.expectOne(`${hardcore}/latest`).flush({ data: { 4151: { high: 900_000 } } });
        expect(hardcoreHigh).toBe(900_000);

        // Each keeps its own list, and its own key for the browser
        repo.getLatestPrices(4151).subscribe(price => (mainHigh = price.high));
        repo.getLatestPrices(4151, 'hardcore').subscribe(price => (hardcoreHigh = price.high));
        httpTesting.expectNone(() => true);
        expect([mainHigh, hardcoreHigh]).toEqual([1_500_000, 900_000]);
        const transferState = TestBed.inject(TransferState);
        expect(transferState.get(makeStateKey<object | null>('wiki-latest-4151'), null)).toEqual({ high: 1_500_000 });
        expect(transferState.get(makeStateKey<object | null>('hardcore-wiki-latest-4151'), null)).toEqual({
          high: 900_000,
        });
      });

      it('keeps the mapping and a day of averages per world', () => {
        repo.getItemMapping().subscribe();
        httpTesting.expectOne(`${main}/mapping`).flush([{ id: 1, name: 'Main item' }]);

        let names: string[] = [];
        repo.getItemMapping('hardcore').subscribe(items => (names = items.map(item => item.name)));
        httpTesting.expectOne(`${hardcore}/mapping`).flush([{ id: 1, name: 'Hardcore item' }]);
        expect(names).toEqual(['Hardcore item']);

        const day = new Date(Date.now() - 86_400_000);
        const seconds = day.getTime() / 1000;
        repo.getAveragePrices(TimeSpan.DAY, day).subscribe();
        httpTesting.expectOne(`${main}/24h?timestamp=${seconds}`).flush({ data: { 1: {} }, timestamp: seconds });
        repo.getAveragePrices(TimeSpan.DAY, day, 'hardcore').subscribe();
        httpTesting.expectOne(`${hardcore}/24h?timestamp=${seconds}`).flush({ data: { 1: {} }, timestamp: seconds });
        repo.getDayBeforeAverages(day, 'hardcore').subscribe();
        httpTesting.expectOne(`${hardcore}/24h?timestamp=${seconds}`).flush({ data: { 1: {} }, timestamp: seconds });
      });
    });
  });

  describe('two days on the server', () => {
    let week = 100;

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

      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(++week * 7 * 86_400_000);
    });

    afterEach(() => vi.useRealTimers());

    const url = (seconds: number) => `${config.pricesBaseUrl.main}/24h?timestamp=${seconds}`;

    it('asks for each day, and keeps both, when they load at the same time', () => {
      const yesterday = new Date(Date.now() - 86_400_000);
      const dayBefore = new Date(Date.now() - 2 * 86_400_000);
      const seen: unknown[] = [];

      repo.getAveragePrices(TimeSpan.DAY, yesterday).subscribe(data => seen.push(data));
      repo.getDayBeforeAverages(dayBefore).subscribe(data => seen.push(data));

      httpTesting.expectOne(url(yesterday.getTime() / 1000)).flush({ data: { 1: { avgLowPrice: 2 } }, timestamp: 0 });
      httpTesting.expectOne(url(dayBefore.getTime() / 1000)).flush({ data: { 1: { avgLowPrice: 1 } }, timestamp: 0 });

      expect(seen).toEqual([{ 1: { avgLowPrice: 2 } }, { 1: { avgLowPrice: 1 } }]);

      repo.getAveragePrices(TimeSpan.DAY, yesterday).subscribe();
      repo.getDayBeforeAverages(dayBefore).subscribe();
      httpTesting.expectNone(() => true);
    });

    it('asks again for a day that came back empty', () => {
      const yesterday = new Date(Date.now() - 86_400_000);
      const request = url(yesterday.getTime() / 1000);

      repo.getAveragePrices(TimeSpan.DAY, yesterday).subscribe();
      httpTesting.expectOne(request).flush({ data: {}, timestamp: 0 });

      repo.getAveragePrices(TimeSpan.DAY, yesterday).subscribe();
      httpTesting.expectOne(request).flush({ data: { 1: { avgLowPrice: 2 } }, timestamp: 0 });
    });
  });

  it('shares the mapping, and a day of averages with the item rows, for the session', () => {
    repo.getItemMapping().subscribe();
    repo.getItemMapping().subscribe();
    httpTesting.expectOne(`${config.pricesBaseUrl.main}/mapping`).flush([]);
    repo.getItemMapping().subscribe();

    const day = new Date(86_400_000);
    repo.getAveragePrices(TimeSpan.DAY, day).subscribe();
    repo.getCachedPriceAverage(4151, TimeSpan.DAY, day).subscribe();
    httpTesting.expectOne(`${config.pricesBaseUrl.main}/24h?timestamp=86400`).flush({ data: {}, timestamp: 86400 });
    repo.getAveragePrices(TimeSpan.DAY, day).subscribe();
    httpTesting.expectNone(() => true);
  });

  it('shares the mapping, a day of averages and the time series per world in the browser', () => {
    const hardcore = 'https://prices.runescape.wiki/api/v2/osrs-hc';
    const day = new Date(86_400_000);

    repo.getItemMapping().subscribe();
    repo.getItemMapping('hardcore').subscribe();
    repo.getItemMapping('hardcore').subscribe();
    httpTesting.expectOne(`${config.pricesBaseUrl.main}/mapping`).flush([]);
    httpTesting.expectOne(`${hardcore}/mapping`).flush([]);

    repo.getAveragePrices(TimeSpan.DAY, day).subscribe();
    repo.getAveragePrices(TimeSpan.DAY, day, 'hardcore').subscribe();
    httpTesting.expectOne(`${config.pricesBaseUrl.main}/24h?timestamp=86400`).flush({ data: {}, timestamp: 86400 });
    httpTesting.expectOne(`${hardcore}/24h?timestamp=86400`).flush({ data: {}, timestamp: 86400 });

    repo.getPriceTimeSeries(4151, '7d', 'hardcore').subscribe();
    httpTesting.expectOne(`${hardcore}/timeseries?id=4151&lookback=7d`).flush({ data: [], itemId: '4151' });
  });

  it('asks the Hardcore Worlds API for an item the server priced in the main game', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    const transferState = TestBed.inject(TransferState);
    transferState.set(makeStateKey<object | null>('wiki-latest-4151'), { high: 1_500_000 });
    transferState.set(makeStateKey<object | null>('hardcore-wiki-latest-561'), { high: 90 });
    repo = TestBed.inject(OsrsPricesRepo);
    httpTesting = TestBed.inject(HttpTestingController);

    let high: number | undefined;
    repo.getLatestPrices(561, 'hardcore').subscribe(price => (high = price.high));
    expect(high).toBe(90);

    repo.getLatestPrices(4151, 'hardcore').subscribe();
    httpTesting
      .expectOne('https://prices.runescape.wiki/api/v2/osrs-hc/latest')
      .flush({ data: { 4151: { high: 900_000 } } });
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
    httpTesting.expectOne(`${config.pricesBaseUrl.main}/latest`);
  });
});
