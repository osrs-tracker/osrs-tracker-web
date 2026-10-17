import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, TransferState, makeStateKey, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GTAG_TOKEN } from '@app/common/analytics/gtag-token';
import { config } from '@config/config';
import PriceTablePage from './price-table-page';
import { TableRow } from './price-table';

// 60 items that each alch for a profit, the first the most; traded a minute before `now`
const now = 1_792_243_860_000;
const items = Array.from({ length: 60 }, (_, i) => ({
  id: 1000 + i,
  name: `Item ${String(i).padStart(2, '0')}`,
  icon: 'x.png',
  members: i % 2 === 0,
  highalch: 10_000 - i,
  limit: 70,
}));
const latest = {
  561: { high: 143, highTime: now / 1000 - 60, low: 141, lowTime: now / 1000 - 60 },
  ...Object.fromEntries(
    items.map(item => [item.id, { high: 5000, highTime: now / 1000 - 60, low: 4900, lowTime: now / 1000 - 60 }]),
  ),
};
const day = Object.fromEntries(items.map(item => [item.id, { highPriceVolume: 1000, lowPriceVolume: 1000 }]));

describe('PriceTablePage', () => {
  let fixture: ComponentFixture<PriceTablePage>;
  let httpTesting: HttpTestingController;

  function setUp(platform: 'browser' | 'server', transferred?: { rows: TableRow[]; total: number }) {
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
    if (transferred)
      TestBed.inject(TransferState).set(makeStateKey<object>('price-table-high-alch'), {
        ...transferred,
        natureRune: 143,
        loadedAt: now,
      });
    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PriceTablePage);
    fixture.componentRef.setInput('kind', 'high-alch');
  }

  /** Renders, so the page asks for the lists, and answers it */
  function flushLists() {
    TestBed.tick();
    httpTesting.expectOne(`${config.pricesBaseUrl}/mapping`).flush(items);
    httpTesting.expectOne(`${config.pricesBaseUrl}/latest`).flush({ data: latest });
    httpTesting.expectOne(req => req.url === `${config.pricesBaseUrl}/24h`).flush({ data: day, timestamp: 0 });
  }

  const rowNames = () =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody th')].map(th => th.textContent?.trim());

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
  });

  afterEach(() => {
    httpTesting.verify();
    vi.useRealTimers();
  });

  it("renders the server's rows without fetching, and loads the lists on the first change", async () => {
    const row: TableRow = {
      id: 1149,
      name: 'Dragon med helm',
      icon: 'x.png',
      members: true,
      buy: 58532,
      alch: 60000,
      key: 1325,
      perLimit: 10_600,
      limit: 8,
      volume: 24_766,
      tradedAt: now,
      natureRune: 143,
    };
    setUp('browser', { rows: [row], total: 1448 });
    await fixture.whenStable();

    expect(rowNames()).toEqual(['Dragon med helm']);
    expect(fixture.nativeElement.textContent).toContain('Showing 1 of 1,448 items');
    expect(fixture.nativeElement.textContent).toContain('+1,325');
    httpTesting.expectNone(() => true);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('thead button')!.click();
    TestBed.tick();
    // Until the lists arrive, the server's rows stay
    expect(rowNames()).toEqual(['Dragon med helm']);
    flushLists();
    await fixture.whenStable();
    expect(rowNames()[0]).toBe('Item 00');
  });

  it('loads the lists straight away without transferred rows, and shows 50 at a time', async () => {
    setUp('browser');
    TestBed.tick();
    expect(fixture.nativeElement.querySelectorAll('skeleton').length).toBeGreaterThan(0);

    flushLists();
    await fixture.whenStable();
    expect(rowNames()).toHaveLength(50);
    expect(rowNames()[0]).toBe('Item 00');
    expect(fixture.nativeElement.textContent).toContain('Showing 50 of 60 items');

    const more = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(button =>
      button.textContent?.includes('Show 50 more'),
    );
    more!.click();
    await fixture.whenStable();
    expect(rowNames()).toHaveLength(60);
  });

  it('hands the browser only the first 50 rows of the default view from the server', async () => {
    setUp('server');
    flushLists();
    await fixture.whenStable();

    const view = TestBed.inject(TransferState).get(
      makeStateKey<{ rows: TableRow[]; total: number }>('price-table-high-alch'),
      null,
    );
    expect(view?.rows).toHaveLength(50);
    expect(view?.total).toBe(60);
    expect(rowNames()).toHaveLength(50);
  });
});
