import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { makeStateKey, PLATFORM_ID, provideZonelessChangeDetection, TransferState } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GTAG_TOKEN } from '@app/common/analytics/gtag-token';
import { AveragePrices, ItemMapping } from '@app/common/api/osrs-prices-repo';
import { config } from '@config/config';
import { PriceMoversCard } from './price-movers-card';
import { PriceMovers } from './price-movers';

const KEY = makeStateKey<PriceMovers>('price-movers');
const DAY = 86_400;

const mapping: ItemMapping[] = [{ id: 1, name: 'Dark bow tie', icon: 'tie.png', members: true }];
const traded = (price: number): AveragePrices => ({
  avgHighPrice: price,
  highPriceVolume: 50_000,
  avgLowPrice: price,
  lowPriceVolume: 50_000,
});
const transferred: PriceMovers = {
  rising: [{ id: 1, name: 'Dark bow tie', icon: 'tie.png', from: 1_000, to: 1_500 }],
  falling: [{ id: 2, name: 'Lime', icon: 'lime.png', from: 300, to: 150 }],
};

describe('PriceMoversCard', () => {
  let fixture: ComponentFixture<PriceMoversCard>;
  let httpTesting: HttpTestingController;
  // The server's lists are shared by the specs in a test worker: far from the weeks `osrs-prices-repo.spec.ts` uses
  let week = 1_000;
  const page = () => fixture.nativeElement as HTMLElement;
  const rowNames = () => [...page().querySelectorAll('a[price-mover-row]')].map(row => row.textContent);

  function setUp(platform: 'browser' | 'server', state?: PriceMovers) {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: GTAG_TOKEN, useValue: null },
      ],
    });
    if (state) TestBed.inject(TransferState).set(KEY, state);
    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PriceMoversCard);
    TestBed.tick();
  }

  function flushLists(yesterday: Record<string, AveragePrices>, dayBefore: Record<string, AveragePrices>) {
    const today = Date.now() / 1000;
    httpTesting.expectOne(`${config.pricesBaseUrl}/mapping`).flush(mapping);
    httpTesting
      .expectOne(`${config.pricesBaseUrl}/24h?timestamp=${today - DAY}`)
      .flush({ data: yesterday, timestamp: 0 });
    httpTesting
      .expectOne(`${config.pricesBaseUrl}/24h?timestamp=${today - 2 * DAY}`)
      .flush({ data: dayBefore, timestamp: 0 });
  }

  beforeEach(() => {
    // The server's lists outlive a render: start each test after the previous one's have expired
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(++week * 7 * DAY * 1000);
  });

  afterEach(() => {
    // First, as a failing `verify` would leave the fake clock on for the next spec in the worker
    vi.useRealTimers();
    httpTesting.verify();
  });

  it('shows the transferred rows and fetches nothing while hydrating', () => {
    setUp('browser', transferred);
    fixture.detectChanges();

    expect(rowNames()).toHaveLength(1);
    expect(page().textContent).toContain('Dark bow tie');
    expect(page().querySelector('section')?.getAttribute('aria-busy')).toBe('false');
    httpTesting.expectNone(() => true);
  });

  it('switches to the fallers without fetching', async () => {
    setUp('browser', transferred);
    fixture.detectChanges();

    page().querySelectorAll<HTMLButtonElement>('[role=radio]')[1].click();
    await fixture.whenStable();

    expect(page().textContent).toContain('Lime');
    expect(page().textContent).not.toContain('Dark bow tie');
    httpTesting.expectNone(() => true);
  });

  it('transfers the rows from the server', async () => {
    setUp('server');

    flushLists({ 1: traded(1_500) }, { 1: traded(1_000) });
    await fixture.whenStable();

    expect(
      TestBed.inject(TransferState)
        .get(KEY, null)
        ?.rising.map(mover => mover.id),
    ).toEqual([1]);
    expect(rowNames()).toHaveLength(1);
  });

  it('leaves an unfinished day to the browser, rendering as loading', async () => {
    setUp('server');

    flushLists({}, { 1: traded(1_000) });
    await fixture.whenStable();

    expect(TestBed.inject(TransferState).hasKey(KEY)).toBe(false);
    expect(page().querySelector('section')?.getAttribute('aria-busy')).toBe('true');
  });

  it('renders a failed load on the server as loading', async () => {
    setUp('server');

    httpTesting.expectOne(`${config.pricesBaseUrl}/mapping`).flush('', { status: 500, statusText: 'Server Error' });
    httpTesting.match(() => true);
    await fixture.whenStable();

    expect(page().querySelector('section')?.getAttribute('aria-busy')).toBe('true');
  });

  it('loads the lists itself after a client-side navigation, and offers a retry when that fails', async () => {
    setUp('browser');

    httpTesting.expectOne(`${config.pricesBaseUrl}/mapping`).flush('', { status: 500, statusText: 'Server Error' });
    httpTesting.match(() => true);
    await fixture.whenStable();

    expect(page().textContent).toContain("Yesterday's movers didn't load.");
  });
});
