import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { NEVER, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { OsrsPricesRepo } from '@app/common/api/osrs-prices-repo';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { PRICE_WORLD, PriceWorld } from '@app/common/api/price-world';
import { PriceTrackerStore } from '../price-tracker-store';
import ItemDetail from './item-detail';

const WHIP = { id: 4151, name: 'Abyssal whip', examine: 'A weapon.', icon: 'Abyssal whip.png' } as Item;

describe('ItemDetail', () => {
  function render(
    world: PriceWorld,
    getPriceTimeSeries: () => unknown = () => NEVER,
    recordItemLookup: (...args: unknown[]) => unknown = () => NEVER,
  ) {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: PRICE_WORLD, useValue: world },
        { provide: OsrsPricesRepo, useValue: { getLatestPrices: () => NEVER, getPriceTimeSeries } },
        { provide: OsrsTrackerRepo, useValue: { recordItemLookup } },
        { provide: AnalyticsService, useValue: { trackEvent: vi.fn(), trackOption: vi.fn() } },
      ],
    });
    const fixture: ComponentFixture<ItemDetail> = TestBed.createComponent(ItemDetail);
    fixture.componentRef.setInput('item', WHIP);
    // Not `whenStable`: the prices never arrive here, and a pending request keeps the app unstable
    fixture.detectChanges();
    return { page: fixture.nativeElement as HTMLElement, fixture };
  }

  it.each<PriceWorld>(['main', 'hardcore'])("records a visitor's lookup in the %s world", world => {
    const recordItemLookup = vi.fn(() => NEVER);
    // The test browser's own user agent counts as a bot
    const userAgent = vi
      .spyOn(navigator, 'userAgent', 'get')
      .mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/140.0');
    render(world, undefined, recordItemLookup);

    expect(recordItemLookup).toHaveBeenCalledExactlyOnceWith(WHIP.id, world);
    userAgent.mockRestore();
  });

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

  it('offers a Hardcore Worlds page every price range, as main does', () => {
    const ranges = (world: PriceWorld) => {
      TestBed.resetTestingModule();
      return [...render(world).page.querySelectorAll('segmented[label="Price range"] [role="radio"]')].map(r =>
        r.textContent?.trim(),
      );
    };

    expect(ranges('hardcore')).toEqual(['1D', '1W', '1M', '1Y']);
    expect(ranges('main')).toEqual(ranges('hardcore'));
  });

  it("doesn't note that Hardcore Worlds are young", () => {
    expect(render('hardcore').page.textContent).not.toContain('opened on');
  });

  it('files a Hardcore Worlds item visit under the Hardcore Worlds recent items, not the main ones', () => {
    localStorage.clear();
    render('hardcore');
    const { recentItems } = TestBed.inject(PriceTrackerStore);

    expect(recentItems().hardcore.map(item => item.id)).toEqual([4151]);
    expect(recentItems().main).toEqual([]);
  });

  describe('the empty chart', () => {
    it('offers the next range on a Hardcore Worlds page, as on main', async () => {
      const { page, fixture } = render('hardcore', () => of([]));
      await Promise.resolve();
      fixture.detectChanges();
      const next = [...page.querySelectorAll('button')].find(button => button.textContent?.includes('Show the last'));

      expect(next?.textContent).toContain('month');
    });
  });
});
