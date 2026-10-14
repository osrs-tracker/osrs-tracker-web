import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fromJagex } from '@osrs-tracker/hiscores';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GTAG_TOKEN } from '@app/common/analytics/gtag-token';
import PlayerDetail from './player-detail';
import { TOXSICK } from './testing/jagex-hiscores';

@Component({ template: '' })
class ErrorPage {}

const URL = '/trackers/xp/ToxSick';

/** ToxSick as the API returns them, tracked at the default offset (0) unless `extra` says otherwise */
const player = (extra: Partial<Player> = {}): Player => ({
  username: 'ToxSick',
  combatLevel: 3,
  type: PlayerType.Normal,
  status: PlayerStatus.Default,
  diedAsHardcore: false,
  lastModified: new Date(),
  scrapingOffsets: [0],
  ...extra,
});

/** `count` stored entries, a day apart, newest first */
const entries = (count: number): object[] =>
  Array.from({ length: count }, (_, i) => ({
    date: new Date(Date.UTC(2026, 9, 10 - i, 2)).toISOString(),
    scrapingOffset: 0,
    ...fromJagex(TOXSICK),
  }));

/** Lets resource values and effects land: a resource takes a response's value after a macrotask */
const settle = async (): Promise<void> => {
  TestBed.tick();
  await new Promise(resolve => setTimeout(resolve));
  TestBed.tick();
};

describe('PlayerDetail', () => {
  let httpTesting: HttpTestingController;
  /** What the page's resolver returns */
  let resolved: Player;

  const lookup = (): TestRequest =>
    httpTesting.expectOne(req => req.method === 'POST' && req.url === '/players/ToxSick/lookup');
  const firstPage = (): TestRequest =>
    httpTesting.expectOne(req => req.url === '/players/ToxSick/hiscores' && req.params.get('skip') === '0');
  const liveHiscores = (): TestRequest => httpTesting.expectOne(req => req.url.includes('/index_lite.json'));

  /** Opens the player page in a person's browser, as the router does (the template is left out: this is its state) */
  const open = async (player: Player, url: string = URL): Promise<PlayerDetail> => {
    resolved = player;
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(url, PlayerDetail);
    // the check the week before starts from, which only the stat tiles use
    httpTesting.match(req => req.params.get('skip') === '14');
    return page;
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocationMocks(),
        provideRouter(
          [
            { path: 'trackers/xp/:username', component: PlayerDetail, resolve: { player: () => resolved } },
            { path: 'error', component: ErrorPage },
          ],
          withComponentInputBinding(),
        ),
        { provide: GTAG_TOKEN, useValue: null },
      ],
    });
    TestBed.overrideTemplate(PlayerDetail, '');
    await TestBed.compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => localStorage.clear());

  describe('tracking the player', () => {
    it('shows the not-found state when they no longer exist (404)', async () => {
      const page = await open(player());
      lookup().flush(null, { status: 404, statusText: 'Not Found' });
      await settle();

      expect(page.playerDetail()).toBeNull();
    });

    it('shows the error page when the hiscores are down (503), keeping the URL', async () => {
      await open(player());
      lookup().flush(null, { status: 503, statusText: 'Service Unavailable' });
      await settle();

      expect(TestBed.inject(Router).url).toBe('/error');
      expect(TestBed.inject(Location).path()).toBe(URL);
    });

    it.each([500, 0])('keeps the resolved player after any other failure (%s)', async status => {
      const tracked = player();
      const page = await open(tracked);
      lookup().flush(null, { status, statusText: 'Error' });
      await settle();

      expect(page.playerDetail()).toBe(tracked);
      expect(TestBed.inject(Router).url).toBe(URL);
    });
  });

  describe('trackingState', () => {
    it('is untracked for a player without a history at the offset', async () => {
      const page = await open(player({ scrapingOffsets: [2] }));
      firstPage().flush(null);
      await settle();

      expect(page.trackingState()).toBe('untracked');
      expect(page.logNotice()?.label).toBe('Not tracked yet');
    });

    it('has started once tracking stores the first entry, and loads it', async () => {
      const page = await open(player({ scrapingOffsets: [2] }));
      firstPage().flush(null);
      await settle();
      const trackedSince = new Date(Date.UTC(2026, 9, 14, 12));
      lookup().flush(player({ scrapingOffsets: [2, 0], trackedSince }));
      await settle();
      firstPage().flush(entries(1));
      await settle();

      expect(page.trackingState()).toBe('started');
      expect(page.logNotice()).toMatchObject({ label: 'Tracking started', date: trackedSince });
    });

    it.each([
      ['tracked', player()],
      ['paused', player({ scrapingOffsets: [], pausedScrapingOffsets: [0] })],
    ])('is tracked for a %s player with a history', async (_, tracked) => {
      const page = await open(tracked);
      firstPage().flush(entries(8));
      await settle();

      expect(page.trackingState()).toBe('tracked');
      expect(page.logNotice()).toBeUndefined();
    });
  });

  it('opens Compare from a link with picked days, and Days takes them out of the URL', async () => {
    const page = await open(player(), `${URL}?day=2026-10-10&vs=2026-10-06`);
    expect(page.logView()).toBe('compare');

    page.setLogView('days');
    expect(TestBed.inject(Location).path()).toBe(URL);
  });

  describe('when the live hiscores fail', () => {
    it('shows the last tracked stats as stale', async () => {
      const page = await open(player());
      firstPage().flush(entries(8));
      liveHiscores().flush(null, { status: 504, statusText: 'Gateway Timeout' });
      await settle();

      expect(page.stale()).toBe(true);
      expect(page.hiscoresFailed()).toBe(false);
    });

    it('fails the hiscores without a history to stand in', async () => {
      const page = await open(player());
      firstPage().flush(null);
      liveHiscores().flush(null, { status: 504, statusText: 'Gateway Timeout' });
      await settle();

      expect(page.stale()).toBe(false);
      expect(page.hiscoresFailed()).toBe(true);
    });

    it.each([
      [false, player()],
      [true, player({ refreshFailed: true })],
    ])("is stale while they load only when the API's refresh failed too (%s)", async (stale, tracked) => {
      const page = await open(tracked);
      firstPage().flush(entries(8));
      await settle();

      expect(page.stale()).toBe(stale);
    });
  });
});
