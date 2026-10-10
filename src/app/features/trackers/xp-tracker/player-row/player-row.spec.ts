import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GTAG_TOKEN } from '@app/common/services/analytics/gtag-token';
import { StorageKey } from '@app/common/services/storage/storage';
import { afterEach, describe, expect, it } from 'vitest';
import { XpTrackerStore } from '../xp-tracker-store';
import { PlayerRow } from './player-row';

describe('PlayerRow', () => {
  afterEach(() => localStorage.clear());

  /** Renders a row for ToxSick, a recent and favorite player, and fails its player request with `status` */
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

  it('keeps a player that failed to load for another reason, and shows a retry', async () => {
    const { store, element } = await failPlayerRequest(503);

    expect(store.recentPlayers()).toEqual(['ToxSick']);
    expect(store.favoritePlayers()).toEqual(['ToxSick']);
    expect(element.querySelector('load-error button')).not.toBeNull();
  });
});
