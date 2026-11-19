import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { GTAG_TOKEN } from '@app/common/analytics/gtag-token';
import { NavMenus } from './nav-menu';
import RootLayout from './root-layout';

describe('RootLayout price tracker menu', () => {
  async function render(url: string) {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: GTAG_TOKEN, useValue: null },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
      ],
    });
    await TestBed.inject(Router).navigateByUrl(url);
    const fixture = TestBed.createComponent(RootLayout);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const rows = () => [...host.querySelectorAll<HTMLAnchorElement>('#menu-trackers a[nav-menu-row]')];
    const href = (label: string) =>
      rows()
        .find(a => a.textContent?.includes(label))
        ?.getAttribute('href');
    const listRows = () => rows().filter(a => listLabels.some(label => a.textContent?.includes(label)));
    /** The list rows' hrefs, split by whether a `hidden` ancestor takes them out of view */
    const lists = () => ({
      shown: listRows()
        .filter(a => !a.closest('[hidden]'))
        .map(a => a.getAttribute('href')),
      hidden: listRows()
        .filter(a => a.closest('[hidden]'))
        .map(a => a.getAttribute('href')),
    });
    const pick = async (name: string) => {
      [...host.querySelectorAll<HTMLElement>('segmented[aria-label="Game world"] button')]
        .find(b => b.textContent?.trim() === name)
        ?.click();
      await fixture.whenStable();
    };
    return { href, lists, pick, host, fixture };
  }

  const listLabels = ['Browse all items', 'High-alch profit', 'Margins', 'New on the GE'];
  const main = [
    '/trackers/price/browse/a',
    '/trackers/price/high-alch',
    '/trackers/price/margins',
    '/trackers/price/new',
  ];
  const hardcore = [
    '/trackers/price/hardcore/browse/a',
    '/trackers/price/hardcore/high-alch',
    '/trackers/price/hardcore/margins',
    '/trackers/price/hardcore/new',
  ];

  it('links each search row to its own world, whichever world the page is in', async () => {
    for (const url of ['/trackers/xp', '/trackers/price/hardcore/margins']) {
      TestBed.resetTestingModule();
      const { href } = await render(url);
      expect(href('Search items')).toBe('/trackers/price');
      expect(href('Search Hardcore Worlds items')).toBe('/trackers/price/hardcore');
    }
  });

  it('shows the Main lists by default and keeps the Hardcore Worlds ones in the page, hidden', async () => {
    expect((await render('/trackers/xp')).lists()).toEqual({ shown: main, hidden: hardcore });
  });

  it('shows the Hardcore Worlds lists on a hardcore URL', async () => {
    const { lists, host } = await render('/trackers/price/hardcore/margins?x=1');
    expect(lists()).toEqual({ shown: hardcore, hidden: main });
    const checked = host.querySelector('segmented [aria-checked="true"]');
    expect(checked?.textContent?.trim()).toBe('HCW');
    expect(checked?.getAttribute('aria-label')).toBe('HCW (Hardcore Worlds)');
  });

  it('follows a pick in the menu, and the next navigation resets it', async () => {
    const { lists, pick, fixture } = await render('/');
    await pick('HCW');
    expect(lists()).toEqual({ shown: hardcore, hidden: main });
    await TestBed.inject(Router).navigateByUrl('/trackers/price/margins');
    await fixture.whenStable();
    expect(lists()).toEqual({ shown: main, hidden: hardcore });
  });

  it('drops a pick when the menu closes without navigating', async () => {
    const { lists, pick, fixture } = await render('/trackers/price/margins');
    const navMenus = fixture.debugElement.injector.get(NavMenus);
    navMenus.open.set('menu-trackers');
    await fixture.whenStable();
    await pick('HCW');
    expect(lists()).toEqual({ shown: hardcore, hidden: main });
    navMenus.open.set(null);
    await fixture.whenStable();
    expect(lists()).toEqual({ shown: main, hidden: hardcore });
  });

  it('puts the world switch beside the Item lists heading, not the Price Tracker one', async () => {
    const { host } = await render('/');
    const heading = host.querySelector('segmented[aria-label="Game world"]')?.parentElement;
    expect(heading?.textContent).toContain('Item lists');
    expect(heading?.textContent).not.toContain('Price Tracker');
  });
});
