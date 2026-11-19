import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { TrackerHero } from './tracker-hero';

describe('TrackerHero', () => {
  async function title(inputs: Record<string, string>): Promise<string> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(TrackerHero);
    Object.entries({ intro: 'Intro', ...inputs }).forEach(([name, value]) =>
      fixture.componentRef.setInput(name, value),
    );
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).querySelector('h1')!.textContent!.replace(/\s+/g, ' ').trim();
  }

  it('reads "<subject> Tracker" by default', async () => {
    expect(await title({ subject: 'Price' })).toBe('Price Tracker');
  });

  it('takes the rest of the title, as Hardcore Worlds prices does', async () => {
    expect(await title({ subject: 'Hardcore Worlds', titleRest: 'prices' })).toBe('Hardcore Worlds prices');
  });
});
