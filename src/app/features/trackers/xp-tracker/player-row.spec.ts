import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { fromJagex } from '@osrs-tracker/hiscores';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { TestBed } from '@angular/core/testing';
import { GTAG_TOKEN } from '@app/common/analytics/gtag-token';
import { StorageKey } from '@app/common/storage/storage';
import { afterEach, describe, expect, it } from 'vitest';
import { TOXSICK } from './player-detail/testing/jagex-hiscores';
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

  describe('the XP gained since the last check', () => {
    /** The row for a player last tracked at `lastXp` Overall XP, with the live hiscores at ToxSick's 99,860,556 */
    async function rowFor(lastXp: number): Promise<{ row: PlayerRow; element: HTMLElement }> {
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: GTAG_TOKEN, useValue: null },
        ],
      });
      const { skills, activities } = fromJagex(TOXSICK);
      const lastTracked = { date: new Date(), scrapingOffset: 0, skills, activities };
      lastTracked.skills = { ...skills, Overall: { ...skills['Overall']!, xp: lastXp } };
      const player: Player = {
        username: 'ToxSick',
        combatLevel: 100,
        type: PlayerType.Normal,
        status: PlayerStatus.Default,
        diedAsHardcore: false,
        lastModified: new Date(),
        scrapingOffsets: [0],
        hiscoreEntries: [lastTracked],
      };

      const fixture = TestBed.createComponent(PlayerRow);
      fixture.componentRef.setInput('player', player);
      fixture.componentRef.setInput('scrapingOffset', 0);
      TestBed.tick();
      TestBed.inject(HttpTestingController)
        .expectOne(req => req.url.includes('/index_lite.json'))
        .flush(TOXSICK);
      await fixture.whenStable();
      return { row: fixture.componentInstance, element: fixture.nativeElement };
    }

    it('shows the gain', async () => {
      const { element } = await rowFor(99_860_000);
      expect(element.textContent).toContain('+556 XP');
    });

    it('shows no negative gain after a rollback', async () => {
      const { row, element } = await rowFor(99_870_000);
      expect(row.overallDiff()).toBe(0);
      expect(element.textContent).toContain('No XP gained');
    });

    it('says the progress was reset when the XP dropped below half', async () => {
      const { row, element } = await rowFor(200_000_000);
      expect(row.reset()).toBe(true);
      expect(element.textContent).toContain('Progress reset');
      expect(element.textContent).not.toContain('-');
    });
  });
});
