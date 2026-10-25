import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { Injector, PLATFORM_ID, provideZonelessChangeDetection, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { playerHistory, PlayerHistory } from './player-history';
import { Period } from './player-view';

const entries = (count: number, offset: number): object[] =>
  Array.from({ length: count }, (_, i) => ({
    date: new Date(Date.UTC(2026, 9, 10 - i)).toISOString(),
    scrapingOffset: offset,
    skills: {},
    activities: {},
  }));

/** Lets resource values and effects land: a resource takes a response's value after a macrotask */
const settle = async (): Promise<void> => {
  TestBed.tick();
  await new Promise(resolve => setTimeout(resolve));
  TestBed.tick();
};

describe('playerHistory', () => {
  let httpTesting: HttpTestingController;
  const offset = signal(0);
  const period = signal<Period>(7);
  const milestonePeriod = signal<Period>(7);
  let history: PlayerHistory;

  const page = (scrapingOffset: number, skip: number, limit?: number): TestRequest =>
    httpTesting.expectOne(
      req =>
        req.url === '/players/zezima/hiscores' &&
        req.params.get('scrapingOffset') === String(scrapingOffset) &&
        req.params.get('skip') === String(skip) &&
        (limit === undefined || req.params.get('limit') === String(limit)),
    );
  const previousWeekStart = (scrapingOffset: number): TestRequest => page(scrapingOffset, 14, 1);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        // the server: no live hiscores, only the stored history
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    offset.set(0);
    period.set(7);
    milestonePeriod.set(7);
    history = runInInjectionContext(TestBed.inject(Injector), () =>
      playerHistory({ username: 'zezima', offset, enabled: signal(true), period, milestonePeriod }),
    );
    TestBed.tick();
  });

  // The pages after the first belong to the offset they were loaded for; mixed in, the days would be wrong
  it('starts over at another offset, ignoring a page still loading for the old one', async () => {
    page(0, 0, 8).flush(entries(8, 0));
    previousWeekStart(0).flush([]);
    await settle();
    history.loadMore();
    page(0, 8).flush(entries(7, 0));
    await settle();
    history.loadMore();
    const stillLoading = page(0, 15, 7);
    expect(history.entries()).toHaveLength(15);

    offset.set(2);
    await settle();
    page(2, 0).flush(entries(3, 2));
    previousWeekStart(2).flush([]);
    stillLoading.flush(entries(7, 0));
    await settle();

    expect(history.entries()).toHaveLength(3);
    expect(history.entries().every(entry => entry.scrapingOffset === 2)).toBe(true);
    expect(history.loadingMore()).toBe(false);
    expect(history.hasMore()).toBe(false);
    httpTesting.verify();
  });

  // Checking the offset value isn't enough: back at the first offset, its history has started over too
  it('ignores a page loading from before it went to another offset and back', async () => {
    page(0, 0).flush(entries(8, 0));
    previousWeekStart(0).flush([]);
    await settle();
    history.loadMore();
    const stillLoading = page(0, 8);

    offset.set(2);
    await settle();
    page(2, 0).flush(entries(3, 2));
    previousWeekStart(2).flush([]);
    offset.set(0);
    await settle();
    page(0, 0).flush(entries(8, 0));
    previousWeekStart(0).flush([]);
    stillLoading.flush(entries(7, 0));
    await settle();

    expect(history.entries()).toHaveLength(8);
    expect(history.loadingMore()).toBe(false);
    expect(history.hasMore()).toBe(true);
    httpTesting.verify();
  });

  // The first page holds a week, so the week before's comparison comes from its one starting check
  it('adds the check the week before starts from to the compared entries, once', async () => {
    page(0, 0, 8).flush(entries(8, 0));
    await settle();

    // the chart doesn't wait for it, the tiles do
    expect(history.periodLoaded()).toBe(true);
    expect(history.comparedLoaded()).toBe(false);
    previousWeekStart(0).flush(entries(15, 0).slice(14));
    await settle();

    expect(history.comparedLoaded()).toBe(true);
    expect(history.entries()).toHaveLength(8);
    expect(history.comparedEntries().map(entry => entry.date.getUTCDate())).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 26]);

    history.loadMore(7);
    page(0, 8).flush(entries(15, 0).slice(8));
    await settle();
    history.loadMore(7);
    page(0, 15).flush(entries(22, 0).slice(15));
    await settle();

    // loaded with the rest of the history now, so not twice
    expect(history.comparedEntries()).toHaveLength(22);
    httpTesting.verify();
  });

  it('reports a failed load of the check the week before starts from, and reloads it', async () => {
    page(0, 0, 8).flush(entries(8, 0));
    previousWeekStart(0).flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(history.periodLoaded()).toBe(true);
    expect(history.previousPeriodFailed()).toBe(true);
    expect(history.comparedEntries()).toHaveLength(8);

    history.reloadPreviousPeriod();
    TestBed.tick();
    expect(history.comparedLoaded()).toBe(true);
    previousWeekStart(0).flush(entries(15, 0).slice(14));
    await settle();

    expect(history.previousPeriodFailed()).toBe(false);
    expect(history.comparedEntries()).toHaveLength(9);
    httpTesting.verify();
  });

  // The history holds 90 days: 90D loads them all, and only 7D and 30D have a whole period before to compare with
  it('loads what a longer period needs, and the period before only where the history covers it', async () => {
    page(0, 0, 8).flush(entries(8, 0));
    previousWeekStart(0).flush([]);
    await settle();

    period.set(90);
    await settle();
    expect(history.periodLoaded()).toBe(false);
    page(0, 8, 83).flush(entries(91, 0).slice(8));
    await settle();
    expect(history.periodLoaded()).toBe(true);
    expect(history.entries()).toHaveLength(91);

    period.set(30);
    await settle();
    page(0, 60, 1).flush(entries(61, 0).slice(60));
    await settle();

    period.set(60);
    await settle();
    expect(history.periodLoaded()).toBe(true);
    httpTesting.verify();
  });

  // The milestones card has its own period: it loads more history, but the chart and the tiles stay on theirs
  it('loads what the milestones period needs without changing the chart’s period', async () => {
    page(0, 0, 8).flush(entries(8, 0));
    previousWeekStart(0).flush([]);
    await settle();

    milestonePeriod.set(30);
    await settle();
    expect(history.periodLoaded()).toBe(true);
    expect(history.milestonePeriodLoaded()).toBe(false);
    page(0, 8, 23).flush(entries(31, 0).slice(8));
    await settle();
    expect(history.milestonePeriodLoaded()).toBe(true);
    expect(history.entries()).toHaveLength(31);

    // a longer chart period loads only what the card hasn't, and the tiles compare the chart's period
    period.set(60);
    await settle();
    expect(history.periodLoaded()).toBe(false);
    expect(history.milestonePeriodLoaded()).toBe(true);
    page(0, 31, 30).flush(entries(61, 0).slice(31));
    await settle();
    expect(history.periodLoaded()).toBe(true);

    period.set(7);
    milestonePeriod.set(90);
    await settle();
    previousWeekStart(0).flush([]);
    expect(history.periodLoaded()).toBe(true);
    expect(history.milestonePeriodLoaded()).toBe(false);
    page(0, 61, 30).flush(entries(91, 0).slice(61));
    await settle();
    expect(history.milestonePeriodLoaded()).toBe(true);
    httpTesting.verify();
  });
});
