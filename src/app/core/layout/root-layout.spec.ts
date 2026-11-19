import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { GTAG_TOKEN } from '@app/common/analytics/gtag-token';
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
    const hrefs = () =>
      ['Search items', 'Browse all items', 'High-alch profit', 'Margins', 'New on the GE'].map(label =>
        [...host.querySelectorAll<HTMLAnchorElement>('a[nav-menu-row]')]
          .find(a => a.textContent?.includes(label))
          ?.getAttribute('href'),
      );
    const pick = async (name: string) => {
      [...host.querySelectorAll<HTMLElement>('segmented[aria-label="Game world"] button')]
        .find(b => b.textContent?.trim() === name)
        ?.click();
      await fixture.whenStable();
    };
    return { hrefs, pick, host, fixture };
  }

  const main = [
    '/trackers/price',
    '/trackers/price/browse/a',
    '/trackers/price/high-alch',
    '/trackers/price/margins',
    '/trackers/price/new',
  ];
  const hardcore = main.map(path => path.replace('/price', '/price/hardcore'));

  it('links to Main by default', async () => {
    expect((await render('/trackers/xp')).hrefs()).toEqual(main);
  });

  it('links to Hardcore Worlds on a hardcore URL', async () => {
    const { hrefs, host } = await render('/trackers/price/hardcore/margins?x=1');
    expect(hrefs()).toEqual(hardcore);
    expect(host.querySelector('segmented [aria-checked="true"]')?.textContent?.trim()).toBe('HCW');
  });

  it('follows a pick in the menu, and the next navigation resets it', async () => {
    const { hrefs, pick, fixture } = await render('/');
    await pick('HCW');
    expect(hrefs()).toEqual(hardcore);
    await TestBed.inject(Router).navigateByUrl('/trackers/price/margins');
    await fixture.whenStable();
    expect(hrefs()).toEqual(main);
  });

  it('has no separate Hardcore Worlds row', async () => {
    expect((await render('/')).host.textContent).not.toContain('Hardcore Worlds prices');
  });
});
