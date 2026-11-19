import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { NEVER } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { OsrsPricesRepo } from '@app/common/api/osrs-prices-repo';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { PRICE_WORLD, PriceWorld } from '@app/common/api/price-world';
import ItemDetail from './item-detail';

const WHIP = { id: 4151, name: 'Abyssal whip', examine: 'A weapon.', icon: 'Abyssal whip.png' } as Item;

describe('ItemDetail', () => {
  function render(world: PriceWorld): { page: HTMLElement } {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: PRICE_WORLD, useValue: world },
        { provide: OsrsPricesRepo, useValue: { getLatestPrices: () => NEVER, getPriceTimeSeries: () => NEVER } },
        { provide: OsrsTrackerRepo, useValue: { recordItemLookup: () => NEVER } },
        { provide: AnalyticsService, useValue: { trackEvent: vi.fn(), trackOption: vi.fn() } },
      ],
    });
    const fixture: ComponentFixture<ItemDetail> = TestBed.createComponent(ItemDetail);
    fixture.componentRef.setInput('item', WHIP);
    // Not `whenStable`: the prices never arrive here, and a pending request keeps the app unstable
    fixture.detectChanges();
    return { page: fixture.nativeElement };
  }

  const hrefs = (page: HTMLElement) => [...page.querySelectorAll('a[href]')].map(a => a.getAttribute('href'));

  it('keeps a Hardcore Worlds item page inside Hardcore Worlds, apart from the tile to the main page', () => {
    const { page } = render('hardcore');
    const links = hrefs(page);

    expect(links).toContain('/trackers/price/hardcore');
    expect(links).toContain('/trackers/price/hardcore/browse/a');
    expect(links).not.toContain('/trackers/price');
    expect(links.filter(href => href?.startsWith('/trackers/price/browse'))).toEqual([]);
    expect(links).toContain('/trackers/price/4151');
  });

  it('links a main item page to the main price tracker', () => {
    const links = hrefs(render('main').page);

    expect(links).toContain('/trackers/price');
    expect(links).toContain('/trackers/price/browse/a');
    expect(links).toContain('/trackers/price/hardcore/4151');
  });

  it("doesn't offer the month and year ranges on a Hardcore Worlds page until it is old enough", () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-19T10:00:00Z'));
    try {
      const { page } = render('hardcore');
      const ranges = [...page.querySelectorAll('segmented[label="Price range"] [role="radio"]')].map(r =>
        r.textContent?.trim(),
      );

      expect(ranges).toEqual(['1D', '1W']);
    } finally {
      vi.useRealTimers();
    }
  });
});
