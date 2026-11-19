import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { PRICE_WORLD, PriceWorld } from '@app/common/api/price-world';
import { GTAG_TOKEN } from '@app/common/analytics/gtag-token';
import BrowseItems from './browse-items';

describe('BrowseItems', () => {
  function render(world: PriceWorld) {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PRICE_WORLD, useValue: world },
        { provide: GTAG_TOKEN, useValue: null },
      ],
    });
    const fixture = TestBed.createComponent(BrowseItems);
    fixture.componentRef.setInput('letter', 'a');
    fixture.componentRef.setInput('items', [{ id: 4151, name: 'Abyssal whip', icon: 'x.png' }]);
    TestBed.inject(HttpTestingController).match(() => true);
    return fixture.nativeElement as HTMLElement;
  }

  const hrefs = (page: HTMLElement) => [...page.querySelectorAll('a')].map(a => a.getAttribute('href'));

  it('links the main game under the price tracker', () => {
    const page = render('main');
    TestBed.tick();

    expect(page.querySelector('h1')?.textContent).toBe('Items starting with A');
    expect(hrefs(page)).toEqual(
      expect.arrayContaining(['/trackers/price', '/trackers/price/browse/b', '/trackers/price/4151']),
    );
  });

  it('keeps Hardcore Worlds letters, items and back link under hardcore', () => {
    const page = render('hardcore');
    TestBed.tick();

    expect(page.querySelector('h1')?.textContent).toBe('Hardcore Worlds items starting with A');
    const links = hrefs(page);
    expect(links).toEqual(
      expect.arrayContaining([
        '/trackers/price/hardcore',
        '/trackers/price/hardcore/browse/b',
        '/trackers/price/hardcore/4151',
      ]),
    );
    expect(
      links.filter(href => href?.startsWith('/trackers/price/') && !href.startsWith('/trackers/price/hardcore')),
    ).toEqual([]);
  });
});
