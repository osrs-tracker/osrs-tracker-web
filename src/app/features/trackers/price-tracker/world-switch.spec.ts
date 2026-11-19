import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { PriceWorld } from '@app/common/api/price-world';
import { WorldSwitch } from './world-switch';

describe('WorldSwitch', () => {
  async function render(current: PriceWorld, query = ''): Promise<HTMLAnchorElement[]> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([])] });
    const fixture = TestBed.createComponent(WorldSwitch);
    fixture.componentRef.setInput('current', current);
    fixture.componentRef.setInput('query', query);
    await fixture.whenStable();
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll('a')];
  }

  it('links to each world’s landing and marks the current one', async () => {
    const [main, hardcore] = await render('hardcore');

    expect(main.textContent).toContain('Main');
    expect(main.getAttribute('href')).toBe('/trackers/price');
    expect(main.hasAttribute('aria-current')).toBe(false);
    expect(hardcore.textContent).toContain('Hardcore Worlds');
    expect(hardcore.getAttribute('href')).toBe('/trackers/price/hardcore');
    expect(hardcore.getAttribute('aria-current')).toBe('page');
  });

  it('marks Main on the main landing', async () => {
    const [main, hardcore] = await render('main');

    expect(main.getAttribute('aria-current')).toBe('page');
    expect(hardcore.hasAttribute('aria-current')).toBe(false);
  });

  it('keeps the search in both links', async () => {
    const links = await render('main', 'abyssal whip');

    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/trackers/price?q=abyssal%20whip',
      '/trackers/price/hardcore?q=abyssal%20whip',
    ]);
  });
});
