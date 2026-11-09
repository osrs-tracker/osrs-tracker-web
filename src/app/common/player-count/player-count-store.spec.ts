import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PlayerCountStore } from './player-count-store';

const count = (total: number, date: string): object => ({
  date,
  total,
  members: total,
  f2p: 0,
  worlds: 1,
  byLocation: {},
});

/** Lets resource values land: a resource takes a response's value after a macrotask */
const settle = async (): Promise<void> => {
  TestBed.tick();
  await new Promise(resolve => setTimeout(resolve));
  TestBed.tick();
};

describe('PlayerCountStore', () => {
  let httpTesting: HttpTestingController;
  let store: InstanceType<typeof PlayerCountStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    store = TestBed.inject(PlayerCountStore);
  });

  it('shows the live count, the stored sample while the live one fails, and fails only when both do', async () => {
    store.refresh();
    TestBed.tick();
    httpTesting.expectOne('/player-counts/latest').flush(count(100, '2026-10-13T20:00:00Z'));
    httpTesting.expectOne('/player-counts/live').flush(count(120, '2026-10-13T20:05:00Z'));
    await settle();
    expect(store.count()?.total).toBe(120);

    store.refresh();
    TestBed.tick();
    httpTesting.expectOne('/player-counts/latest').flush(count(100, '2026-10-13T20:00:00Z'));
    httpTesting.expectOne('/player-counts/live').flush(null, { status: 502, statusText: 'Bad Gateway' });
    await settle();
    expect(store.count()?.total).toBe(100);
    expect(store.failed()).toBe(false);

    store.refresh();
    TestBed.tick();
    httpTesting.expectOne('/player-counts/latest').flush(null, { status: 500, statusText: 'Server Error' });
    httpTesting.expectOne('/player-counts/live').flush(null, { status: 502, statusText: 'Bad Gateway' });
    await settle();
    expect(store.count()).toBeUndefined();
    expect(store.failed()).toBe(true);
  });

  it('loads the live count so the transfer cache can carry it, and revalidates on refreshes', async () => {
    store.refresh();
    TestBed.tick();
    httpTesting.expectOne('/player-counts/latest').flush(count(100, '2026-10-13T20:00:00Z'));
    // The transfer cache leaves out `no-cache` requests: the browser would fetch the server's count again on hydration
    const first = httpTesting.expectOne('/player-counts/live');
    expect(first.request.cache).toBe('default');
    first.flush(count(120, '2026-10-13T20:05:00Z'));
    await settle();

    store.refresh();
    TestBed.tick();
    httpTesting.expectOne('/player-counts/latest').flush(count(100, '2026-10-13T20:00:00Z'));
    const refresh = httpTesting.expectOne('/player-counts/live');
    expect(refresh.request.cache).toBe('no-cache');
    refresh.flush(count(130, '2026-10-13T20:06:00Z'));
    await settle();
    expect(store.count()?.total).toBe(130);
  });

  it('is frozen when the live count repeats a count read five minutes or more before it', async () => {
    const load = async (stored: object, live: object): Promise<void> => {
      store.refresh();
      TestBed.tick();
      httpTesting.expectOne('/player-counts/latest').flush(stored);
      httpTesting.expectOne('/player-counts/live').flush(live);
      await settle();
    };

    await load(count(100, '2026-11-09T17:25:00Z'), count(100, '2026-11-09T17:29:00Z'));
    expect(store.frozen()).toBe(false);

    await load(count(100, '2026-11-09T17:25:00Z'), count(100, '2026-11-09T17:30:00Z'));
    expect(store.frozen()).toBe(true);

    // A new sample, still the same count: the live count matches the first reading of it
    await load(count(100, '2026-11-09T17:35:00Z'), count(100, '2026-11-09T17:36:00Z'));
    expect(store.frozen()).toBe(true);

    // Another stale list, first seen now, then again five minutes later
    await load(count(100, '2026-11-09T17:35:00Z'), count(130, '2026-11-09T17:37:00Z'));
    expect(store.frozen()).toBe(false);
    await load(count(100, '2026-11-09T17:35:00Z'), count(130, '2026-11-09T17:42:00Z'));
    expect(store.frozen()).toBe(true);

    await load(count(100, '2026-11-09T17:45:00Z'), count(140, '2026-11-09T17:46:00Z'));
    expect(store.frozen()).toBe(false);
  });

  it('remembers counts read while nothing reads frozen, such as the Game menu card polling', async () => {
    const load = async (stored: object, live: object): Promise<void> => {
      store.refresh();
      TestBed.tick();
      httpTesting.expectOne('/player-counts/latest').flush(stored);
      httpTesting.expectOne('/player-counts/live').flush(live);
      await settle();
    };

    await load(count(100, '2026-11-09T17:25:00Z'), count(130, '2026-11-09T17:26:00Z'));
    await load(count(100, '2026-11-09T17:35:00Z'), count(100, '2026-11-09T17:36:00Z'));
    await load(count(100, '2026-11-09T17:35:00Z'), count(130, '2026-11-09T17:37:00Z'));
    expect(store.frozen()).toBe(true);
  });
});
