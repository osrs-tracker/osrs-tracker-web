import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PlayerType } from '@osrs-tracker/models';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { liveTable, OsrsProxyRepo } from './osrs-proxy-repo';

describe('liveTable', () => {
  // its main-table entry is a stub left at Tutorial Island
  it("takes a Hardcore Worlds character's stats from its own table, everyone else's from the main one", () => {
    expect(liveTable(PlayerType.HardcoreMain)).toBe('hiscore_oldschool_hardcore_mains');
    expect(liveTable(PlayerType.Hardcore)).toBe('hiscore_oldschool');
    expect(liveTable(PlayerType.Normal)).toBe('hiscore_oldschool');
    expect(liveTable(undefined)).toBe('hiscore_oldschool');
  });
});

describe('OsrsProxyRepo', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('fetches the live hiscore from the given table', async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });

    const hiscore = firstValueFrom(
      TestBed.inject(OsrsProxyRepo).getPlayerHiscore('zezima', 2, 'hiscore_oldschool_hardcore_mains'),
    );
    TestBed.inject(HttpTestingController)
      .expectOne(
        'https://runescape-api.freekmencke.com/rs/m=hiscore_oldschool_hardcore_mains/index_lite.json?player=zezima',
      )
      .flush({ skills: [], activities: [] });

    expect(await hiscore).toMatchObject({ scrapingOffset: 2, skills: {}, activities: {} });
  });
});
