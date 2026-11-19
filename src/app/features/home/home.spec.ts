import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { GTAG_TOKEN } from '@app/common/analytics/gtag-token';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { ItemSearch } from '@app/features/trackers/price-tracker/item-search';
import { PlayerSearch } from '@app/features/trackers/xp-tracker/player-search';
import Home from './home';

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  let root: HTMLElement;

  async function render(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: GTAG_TOKEN, useValue: null },
        {
          provide: OsrsTrackerRepo,
          useValue: {
            getNews: () => of([]),
            getRecentPlayerLookups: () => of([]),
            getRecentItemLookups: () => of([]),
            searchItems: () => of([]),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(Home);
    document.body.appendChild(fixture.nativeElement);
    root = fixture.nativeElement;
    await fixture.whenStable();
  }

  const options = (): HTMLButtonElement[] => [...root.querySelectorAll<HTMLButtonElement>('segmented button')];
  const checked = (): string =>
    options()
      .find(option => option.getAttribute('aria-checked') === 'true')!
      .textContent!.trim();
  const itemSearch = (): ItemSearch | undefined =>
    fixture.debugElement.query(By.directive(ItemSearch))?.componentInstance;

  async function choose(label: string): Promise<void> {
    options()
      .find(option => option.textContent!.includes(label))!
      .click();
    await fixture.whenStable();
  }

  it('offers Player, Main items and HCW items, the last titled in full', async () => {
    await render();

    expect(options().map(option => option.textContent!.trim())).toEqual(['Player', 'Main items', 'HCW items']);
    expect(options()[2].title).toBe('Hardcore Worlds items');
    expect(checked()).toBe('Player');
  });

  it('searches players first, then main items, then Hardcore Worlds items', async () => {
    await render();
    expect(fixture.debugElement.query(By.directive(PlayerSearch))).toBeTruthy();
    expect(itemSearch()).toBeUndefined();

    await choose('Main items');
    expect(fixture.debugElement.query(By.directive(PlayerSearch))).toBeNull();
    expect(itemSearch()!.world()).toBe('main');
    expect(itemSearch()!.itemsPath()).toBe('/trackers/price');

    await choose('HCW items');
    expect(checked()).toBe('HCW items');
    expect(itemSearch()!.world()).toBe('hardcore');
    expect(itemSearch()!.itemsPath()).toBe('/trackers/price/hardcore');
  });

  it('keeps focus on the switch when the mode changes', async () => {
    await render();
    options()[1].focus();

    await choose('Main items');
    await fixture.whenStable();
    expect(document.activeElement?.closest('segmented')).toBeTruthy();
    expect(document.activeElement?.textContent).toContain('Main items');

    await choose('HCW items');
    await fixture.whenStable();
    expect(document.activeElement?.textContent).toContain('HCW items');
  });

  it('hides the tracking offset and the price links by turns, so the hero keeps its height', async () => {
    await render();
    const offset = root.querySelector('tracking-offset')!;
    const links = root.querySelector('[price-tracker-links]')!;

    expect(offset.classList.contains('invisible')).toBe(false);
    expect(links.classList.contains('invisible')).toBe(true);

    await choose('HCW items');
    expect(offset.classList.contains('invisible')).toBe(true);
    expect(links.classList.contains('invisible')).toBe(false);
  });

  it("points the price links at the chosen world's tracker", async () => {
    await render();
    const hrefs = () => [...root.querySelectorAll('[price-tracker-links] a')].map(a => a.getAttribute('href'));

    await choose('Main items');
    await fixture.whenStable();
    expect(hrefs()).toContain('/trackers/price/margins');

    await choose('HCW items');
    await fixture.whenStable();
    expect(hrefs()).toEqual([
      '/trackers/price/hardcore/browse/a',
      '/trackers/price/hardcore/high-alch',
      '/trackers/price/hardcore/margins',
      '/trackers/price/hardcore/new',
    ]);
  });

  it("links the Price Tracker card's footer to the A–Z list and to Hardcore Worlds prices, named in full", async () => {
    await render();
    const links = [...root.querySelectorAll<HTMLAnchorElement>('[footer] a')];
    // jsdom applies no CSS, so the name is the text without the aria-hidden short label (the full one is sr-only)
    const accessibleName = (link: HTMLAnchorElement): string => {
      const clone = link.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('[aria-hidden="true"]').forEach(hidden => hidden.remove());
      return clone.textContent!.replace(/\s+/g, ' ').trim();
    };

    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/trackers/price/browse/a',
      '/trackers/price/hardcore',
    ]);
    expect(links.map(accessibleName)).toEqual(['Browse items A–Z', 'Hardcore Worlds prices']);
  });
});
