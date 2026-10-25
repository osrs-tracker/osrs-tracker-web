import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, TransferState, makeStateKey, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GTAG_TOKEN } from '@app/common/analytics/gtag-token';
import { config } from '@config/config';
import NewItemsPage, { NewItemPrices } from './new-items-page';

const now = Date.UTC(2026, 10, 4, 12);
// 30 items: 12 from one update, 18 from the one before, newest first as the API sends them
const newItems = Array.from({ length: 30 }, (_, i) => ({
  id: 34_000 - i,
  name: `Item ${String(i).padStart(2, '0')}`,
  icon: 'x.png',
  addedAt: i < 12 ? '2026-11-04T11:00:03.000Z' : '2026-10-28T11:00:05.000Z',
}));

describe('NewItemsPage', () => {
  let fixture: ComponentFixture<NewItemsPage>;
  let httpTesting: HttpTestingController;
  const page = () => fixture.nativeElement as HTMLElement;
  const text = () => page().textContent ?? '';
  const rowNames = () => [...page().querySelectorAll('tbody th[scope=row]')].map(th => th.textContent?.trim());
  const dayHeaders = () => [...page().querySelectorAll('th[scope=rowgroup]')].map(th => th.textContent?.trim());

  function setUp(platform: 'browser' | 'server', transferred?: NewItemPrices) {
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
    if (transferred) TestBed.inject(TransferState).set(makeStateKey<NewItemPrices>('new-items-prices'), transferred);
    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NewItemsPage);
  }

  function flushItems(items: unknown[] = newItems) {
    TestBed.tick();
    httpTesting.expectOne(req => req.url === '/new-items' && req.params.get('limit') === '100').flush(items);
  }

  /** The prices load once the list has: its value lands a task after the flush */
  async function settle() {
    await new Promise(resolve => setTimeout(resolve));
    TestBed.tick();
  }

  /**
   * The Wiki's lists: the first item traded two hours ago, the second never, the rest a minute ago. `day: false` when
   * the repo still has the day from an earlier load (it keeps it).
   */
  async function flushLists({ day = true } = {}) {
    await settle();
    const latest = Object.fromEntries(
      newItems.slice(2).map(item => [item.id, { high: 12_345, highTime: now / 1000 - 60 }]),
    );
    latest[newItems[0].id] = { high: 52_626_135, highTime: now / 1000 - 7200 };
    httpTesting.expectOne(`${config.pricesBaseUrl}/latest`).flush({ data: latest });
    if (day) flushDay();
  }

  function flushDay() {
    httpTesting
      .expectOne(req => req.url === `${config.pricesBaseUrl}/24h`)
      .flush({ data: { [newItems[0].id]: { highPriceVolume: 900, lowPriceVolume: 467 } }, timestamp: 0 });
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
  });

  afterEach(() => {
    httpTesting.verify();
    vi.useRealTimers();
  });

  it('lists the first 25 under the day each was added, with their prices, and shows the rest on request', async () => {
    setUp('browser');
    flushItems();
    await flushLists();
    await fixture.whenStable();

    expect(dayHeaders()).toEqual(['Wednesday 4 November 2026', 'Wednesday 28 October 2026']);
    expect(rowNames()).toHaveLength(25);
    expect(text()).toContain('Showing 25 of 30 items');
    // The first price is two hours old, the second has never traded
    expect(text()).toContain('52.6M');
    expect(text()).toContain('last traded 2 hours ago');
    expect(text()).toContain('No trades yet');
    expect(text()).toContain('1,367');

    [...page().querySelectorAll('button')].find(button => button.textContent?.includes('Show 5 more'))!.click();
    await fixture.whenStable();
    expect(rowNames()).toHaveLength(30);
    expect([...page().querySelectorAll('button')].some(button => button.textContent?.includes('more'))).toBe(false);
  });

  it("uses the server's prices for every listed item, so it fetches only the list", async () => {
    const byId = Object.fromEntries(newItems.map(item => [item.id, { price: 420, tradedAt: now, volume: 8452 }]));
    setUp('browser', { byId, loadedAt: now });
    flushItems();
    await fixture.whenStable();

    expect(text()).toContain('8,452');
    httpTesting.expectNone(() => true);
  });

  it('says since when no item is new', async () => {
    setUp('browser');
    flushItems([]);
    await fixture.whenStable();

    expect(text()).toContain('No new items since 25 October 2026.');
    expect(page().querySelector('table')).toBeNull();
  });

  it('keeps the rows when the prices fail, with a retry in each price', async () => {
    setUp('browser');
    flushItems();
    await settle();
    flushDay();
    httpTesting.expectOne(`${config.pricesBaseUrl}/latest`).flush(null, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();

    expect(rowNames()).toHaveLength(25);
    expect(page().querySelectorAll('[aria-label="Prices didn’t load. Retry"]')).toHaveLength(25);

    page().querySelector<HTMLButtonElement>('[aria-label="Prices didn’t load. Retry"]')!.click();
    await flushLists({ day: false });
    await fixture.whenStable();
    expect(text()).toContain('52.6M');
  });

  it('shows the error with a retry when the list fails', async () => {
    setUp('browser');
    TestBed.tick();
    httpTesting.expectOne(req => req.url === '/new-items').flush(null, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(text()).toContain('New items didn’t load.');
  });
});
