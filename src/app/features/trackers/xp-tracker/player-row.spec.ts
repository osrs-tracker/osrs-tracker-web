import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GTAG_TOKEN } from '@app/common/analytics/gtag-token';
import { StorageKey } from '@app/common/storage/storage';
import { PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { afterEach, describe, expect, it } from 'vitest';
import { XpTrackerStore } from './xp-tracker-store';
import { PlayerRow } from './player-row';

describe('PlayerRow', () => {
  afterEach(() => localStorage.clear());

  async function failPlayerRequest(
    status: number,
  ): Promise<{ store: InstanceType<typeof XpTrackerStore>; element: HTMLElement }> {
    localStorage.setItem(StorageKey.XpTrackerRecentPlayers, '["ToxSick"]');
    localStorage.setItem(StorageKey.XpTrackerFavoritePlayers, '["ToxSick"]');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GTAG_TOKEN, useValue: null },
      ],
    });

    const fixture = TestBed.createComponent(PlayerRow);
    fixture.componentRef.setInput('username', 'ToxSick');
    fixture.componentRef.setInput('scrapingOffset', 0);
    TestBed.tick();

    TestBed.inject(HttpTestingController)
      .expectOne(req => req.url === '/players/ToxSick')
      .flush(null, { status, statusText: 'Error' });
    await fixture.whenStable();

    return { store: TestBed.inject(XpTrackerStore), element: fixture.nativeElement };
  }

  it('removes a player that no longer exists from recent and favorite players', async () => {
    const { store } = await failPlayerRequest(404);

    expect(store.recentPlayers()).toEqual([]);
    expect(store.favoritePlayers()).toEqual([]);
  });

  // its main-table entry is a stub left at Tutorial Island
  it("fetches a Hardcore Worlds character's live stats from its own table", async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GTAG_TOKEN, useValue: null },
      ],
    });
    const fixture = TestBed.createComponent(PlayerRow);
    fixture.componentRef.setInput('username', 'ToxSick');
    fixture.componentRef.setInput('scrapingOffset', 0);
    TestBed.tick();

    const httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectNone(req => req.url.includes('/index_lite.json'));
    httpTesting
      .expectOne(req => req.url === '/players/ToxSick')
      .flush({ username: 'ToxSick', type: PlayerType.HardcoreMain, status: PlayerStatus.Default });
    // not whenStable(): it waits for the hiscore request too
    await new Promise(resolve => setTimeout(resolve));

    httpTesting.expectOne(req => req.url.includes('/m=hiscore_oldschool_hardcore_mains/index_lite.json'));
    httpTesting.verify();
  });

  it('keeps a player that failed to load for another reason, and shows a retry', async () => {
    const { store, element } = await failPlayerRequest(503);

    expect(store.recentPlayers()).toEqual(['ToxSick']);
    expect(store.favoritePlayers()).toEqual(['ToxSick']);
    expect(element.querySelector('load-error button')).not.toBeNull();
  });
});
