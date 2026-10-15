import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fromJagex } from '@osrs-tracker/hiscores';
import { beforeEach, describe, expect, it } from 'vitest';
import { GTAG_TOKEN } from '@app/common/analytics/gtag-token';
import { THE_FRAKING } from '../testing/jagex-hiscores';
import { CompareDays } from './compare-days';
import { NO_DAY } from './compare-url';

/** The player page around the card: the Days/Compare switch shows and hides it */
@Component({
  template: '<compare-days username="zezima" [offset]="0" [shown]="shown()" />',
  imports: [CompareDays],
})
class PlayerPage {
  readonly shown = signal(true);
}

const PAGE = '/trackers/xp/zezima';

/** Five stored checks, 10 to 6 October, newest first */
const history = Array.from({ length: 5 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 9, 10 - i, 2)).toISOString(),
  scrapingOffset: 0,
  ...fromJagex(THE_FRAKING),
}));

/** Lets resource values and effects land: a resource takes a response's value after a macrotask */
const settle = async (): Promise<void> => {
  TestBed.tick();
  await new Promise(resolve => setTimeout(resolve));
  TestBed.tick();
};

describe('CompareDays', () => {
  let harness: RouterTestingHarness;

  /** Opens the player page at `url` with the card on it (the template is left out: this is its state), loaded */
  const open = async (url: string = PAGE): Promise<CompareDays> => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    TestBed.inject(HttpTestingController)
      .expectOne(req => req.url === '/players/zezima/hiscores' && req.params.get('size') === '91')
      .flush(history);
    await settle();
    return harness.fixture.debugElement.query(By.directive(CompareDays)).componentInstance;
  };
  /** The picked days, as `day vs` keys */
  const picks = (card: CompareDays): string => `${card.day()?.key} vs ${card.vs()?.key ?? NO_DAY}`;
  const addressBar = (): string => TestBed.inject(Location).path();

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocationMocks(),
        provideRouter([{ path: 'trackers/xp/:username', component: PlayerPage }]),
        { provide: GTAG_TOKEN, useValue: null },
      ],
    });
    TestBed.overrideTemplate(CompareDays, '');
    await TestBed.compileComponents();
  });

  it('compares the newest day with the oldest, and keeps them out of the URL until picked', async () => {
    const card = await open();

    expect(picks(card)).toBe('2026-10-10 vs 2026-10-06');
    expect(addressBar()).toBe(PAGE);
  });

  it('puts the picked days in the URL without navigating', async () => {
    const card = await open();
    card.pick({ day: '2026-10-08' });

    expect(picks(card)).toBe('2026-10-08 vs 2026-10-06');
    expect(addressBar()).toBe(`${PAGE}?day=2026-10-08&vs=2026-10-06`);
    expect(TestBed.inject(Router).url).toBe(PAGE);
  });

  it("swaps the two days when one picker takes the other's day", async () => {
    const card = await open();

    card.pick({ day: '2026-10-06' });
    expect(picks(card)).toBe('2026-10-06 vs 2026-10-10');
    card.pick({ vs: '2026-10-06' });
    expect(picks(card)).toBe('2026-10-10 vs 2026-10-06');
    expect(addressBar()).toBe(`${PAGE}?day=2026-10-10&vs=2026-10-06`);
  });

  it('shows one day with vs=none, and never compares it with itself', async () => {
    const card = await open();

    card.pick({ vs: NO_DAY });
    expect(card.vs()).toBeUndefined();
    expect(card.changes()).toBeUndefined();
    expect(addressBar()).toBe(`${PAGE}?day=2026-10-10&vs=none`);

    card.pick({ vs: '2026-10-10' });
    expect(picks(card)).toBe('2026-10-10 vs none');
  });

  it('opens the days picked in a link', async () => {
    expect(picks(await open(`${PAGE}?day=2026-10-08&vs=2026-10-07`))).toBe('2026-10-08 vs 2026-10-07');
  });

  it.each([
    ['both missing', '?day=2020-01-01&vs=2020-01-02'],
    ['the compared day the fallback day', '?day=2020-01-01&vs=2026-10-10'],
  ])('falls back to the newest and oldest days for days missing from the history (%s)', async (_, query) => {
    expect(picks(await open(PAGE + query))).toBe('2026-10-10 vs 2026-10-06');
  });

  it('puts the picks back in the URL when shown again, after Days took them out', async () => {
    const card = await open();
    card.pick({ day: '2026-10-09' });
    const page = harness.routeDebugElement!.componentInstance as PlayerPage;

    page.shown.set(false);
    // as the page's Days does
    TestBed.inject(Location).replaceState(PAGE);
    await settle();
    page.shown.set(true);
    await settle();

    expect(addressBar()).toBe(`${PAGE}?day=2026-10-09&vs=2026-10-06`);
  });
});
