import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { Injector, PLATFORM_ID, provideZonelessChangeDetection, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { playerHistory, PlayerHistory } from './player-history';

/** `count` stored entries at `offset`, a day apart */
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
  let history: PlayerHistory;

  const page = (scrapingOffset: number, skip: number): TestRequest =>
    httpTesting.expectOne(
      req =>
        req.url === '/players/zezima/hiscores' &&
        req.params.get('scrapingOffset') === String(scrapingOffset) &&
        req.params.get('skip') === String(skip),
    );

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
    history = runInInjectionContext(TestBed.inject(Injector), () =>
      playerHistory({ username: 'zezima', offset, enabled: signal(true), period: signal(7) }),
    );
    TestBed.tick();
  });

  // The pages after the first belong to the offset they were loaded for; mixed in, the days would be wrong
  it('starts over at another offset, ignoring a page still loading for the old one', async () => {
    page(0, 0).flush(entries(15, 0));
    await settle();
    history.loadMore();
    page(0, 15).flush(entries(7, 0));
    await settle();
    history.loadMore();
    const stillLoading = page(0, 22);
    expect(history.entries()).toHaveLength(22);

    offset.set(2);
    await settle();
    page(2, 0).flush(entries(3, 2));
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
    page(0, 0).flush(entries(15, 0));
    await settle();
    history.loadMore();
    const stillLoading = page(0, 15);

    offset.set(2);
    await settle();
    page(2, 0).flush(entries(3, 2));
    offset.set(0);
    await settle();
    page(0, 0).flush(entries(15, 0));
    stillLoading.flush(entries(7, 0));
    await settle();

    expect(history.entries()).toHaveLength(15);
    expect(history.loadingMore()).toBe(false);
    expect(history.hasMore()).toBe(true);
    httpTesting.verify();
  });
});
