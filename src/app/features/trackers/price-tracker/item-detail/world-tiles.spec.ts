import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { AveragePricesAtTime, LatestPrices } from '@app/common/api/osrs-prices-repo';
import { PRICE_WORLD, PriceWorld } from '@app/common/api/price-world';
import { DAY } from '../utc-day';
import { WorldPrices, WorldTile, WorldTiles, worldTile } from './world-tiles';

const TODAY = 1_795_046_400; // 2026-11-19 00:00 UTC
const NOW = new Date((TODAY + 10 * 3600) * 1000);

const hour = (timestamp: number, avgLowPrice: number, lowPriceVolume: number, highPriceVolume = 0) =>
  ({ timestamp, avgLowPrice, avgHighPrice: 0, lowPriceVolume, highPriceVolume }) as AveragePricesAtTime;

const prices = (overrides: Partial<WorldPrices> = {}): WorldPrices => ({
  latest: { low: 6_827_000, high: 6_900_000 } as LatestPrices,
  latestLoading: false,
  latestFailed: false,
  hourly: [
    hour(TODAY - 6 * DAY, 9_000_000, 1),
    hour(TODAY - DAY + 3600, 6_900_000, 4, 9),
    hour(TODAY + 3600, 6_827_000, 2),
  ],
  hourlyLoading: false,
  hourlyFailed: false,
  ...overrides,
});

describe('worldTile', () => {
  it("takes the latest instant sell, the week's change and yesterday's items bought and sold", () => {
    const tile = worldTile('hardcore', prices(), NOW);

    expect(tile.price).toBe(6_827_000);
    expect(tile.week).toMatchObject({ percent: '−24.1%', tone: 'down' });
    // 4 sold + 9 bought on the 18th; today's 2 don't count
    expect(tile.traded).toBe(13);
  });

  it('has no price without a trade, and no change without a priced hour', () => {
    const tile = worldTile('hardcore', prices({ latest: {} as LatestPrices, hourly: [] }), NOW);

    expect(tile).toMatchObject({ price: null, week: undefined, traded: 0 });
  });
});

describe('WorldTiles', () => {
  const tile = (world: PriceWorld, overrides: Partial<WorldTile> = {}): WorldTile => ({
    ...worldTile(world, prices(), NOW),
    ...overrides,
  });

  async function render(world: PriceWorld, tiles: WorldTile[]): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: PRICE_WORLD, useValue: world }],
    });
    const fixture: ComponentFixture<WorldTiles> = TestBed.createComponent(WorldTiles);
    fixture.componentRef.setInput('itemId', 4151);
    fixture.componentRef.setInput('tiles', tiles);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  const links = (nav: HTMLElement) => [...nav.querySelectorAll('a')];

  it('links to the item in both worlds and marks the current one', async () => {
    const [main, hardcore] = links(await render('hardcore', [tile('main'), tile('hardcore')]));

    expect(main.getAttribute('href')).toBe('/trackers/price/4151');
    expect(hardcore.getAttribute('href')).toBe('/trackers/price/hardcore/4151');
    expect(main.hasAttribute('aria-current')).toBe(false);
    expect(hardcore.getAttribute('aria-current')).toBe('page');
    expect(main.textContent).toContain('View →');
    expect(hardcore.textContent).toContain('This page');
  });

  it('shows each world with its price, its change and the items traded yesterday', async () => {
    const [main] = links(await render('main', [tile('main', { price: 639_119 }), tile('hardcore')]));

    expect(main.textContent).toContain('Main');
    expect(main.textContent).toContain('639,119');
    expect(main.textContent).toContain('−24.1% this week');
    expect(main.textContent).toContain('13 traded yesterday');
  });

  it('shows what is still loading or failed in place of the numbers', async () => {
    const [loading, failed] = links(
      await render('main', [
        tile('main', { priceLoading: true, historyLoading: true }),
        tile('hardcore', { historyFailed: true }),
      ]),
    );

    expect(loading.querySelector('skeleton')).not.toBeNull();
    expect(loading.textContent).not.toContain('traded');
    expect(failed.textContent).toContain('Not loaded');
  });

  it('keeps a world without trades as a dash', async () => {
    const [main] = links(
      await render('main', [tile('main', { price: null, week: undefined, traded: 0 }), tile('hardcore')]),
    );

    expect(main.textContent).toContain('–');
    expect(main.textContent).toContain('0 traded yesterday');
  });
});
