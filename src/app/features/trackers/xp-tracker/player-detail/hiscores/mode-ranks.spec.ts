import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fromJagex } from '@osrs-tracker/hiscores';
import { HiscoreEntry, Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { THE_FRAKING } from '../testing/jagex-hiscores';
import { buildTable, ModeRanks, modeTable } from './mode-ranks';

const player = (changes: Partial<Player> = {}): Player =>
  ({
    username: 'zezima',
    combatLevel: 126,
    type: PlayerType.Normal,
    status: PlayerStatus.Default,
    diedAsHardcore: false,
    ...changes,
  }) as Player;

/** The fixture with Defence at level 1 (unranked, as a pure's is) */
const onePure = (): Pick<HiscoreEntry, 'skills'> => {
  const { skills } = fromJagex(THE_FRAKING);
  return { skills: { ...skills, Defence: null } };
};

describe('modeTable', () => {
  it('picks the table of the mode the player still ranks on', () => {
    const table = (changes: Partial<Player>): string | undefined => modeTable(player(changes))?.table;

    expect(table({})).toBeUndefined();
    expect(table({ type: PlayerType.Ironman })).toBe('hiscore_oldschool_ironman');
    expect(table({ type: PlayerType.Hardcore })).toBe('hiscore_oldschool_hardcore_ironman');
    expect(table({ type: PlayerType.Ultimate })).toBe('hiscore_oldschool_ultimate');
    // their hardcore or ultimate rank is frozen, the ironman one isn't
    expect(table({ type: PlayerType.Hardcore, diedAsHardcore: true })).toBe('hiscore_oldschool_ironman');
    expect(table({ type: PlayerType.Ultimate, status: PlayerStatus.DeUltimated })).toBe('hiscore_oldschool_ironman');
    expect(table({ type: PlayerType.Ironman, status: PlayerStatus.DeIroned })).toBeUndefined();
    expect(table({ type: PlayerType.Hardcore, status: PlayerStatus.DeIroned, diedAsHardcore: true })).toBeUndefined();
  });
});

describe('buildTable', () => {
  it('picks Skiller at combat level 3 and 1 Defence at Defence level 1, never probing', () => {
    expect(buildTable(3, onePure())?.table).toBe('hiscore_oldschool_skiller');
    expect(buildTable(45, onePure())?.table).toBe('hiscore_oldschool_skiller_defence');
    expect(buildTable(126, fromJagex(THE_FRAKING))).toBeUndefined();
    expect(buildTable(45, undefined)).toBeUndefined();
  });
});

describe('ModeRanks', () => {
  let httpTesting: HttpTestingController;
  let modeRanks: ModeRanks;
  const tableUrl = (table: string): string =>
    `https://runescape-api.freekmencke.com/rs/m=${table}/index_lite.json?player=zezima`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        ModeRanks,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    modeRanks = TestBed.inject(ModeRanks);
    modeRanks.connect({
      username: 'zezima',
      player: signal(player({ type: PlayerType.Ironman, combatLevel: 45 })),
      hiscore: signal({ date: new Date(), scrapingOffset: 0, activities: {}, ...onePure() }),
    });
  });

  afterEach(() => httpTesting.verify());

  // The proxy is shared with the API and the daily check, so a page view without a tooltip asks Jagex nothing more
  it('asks for the tables only once a tooltip wants them, and leaves out a table the player is not on', async () => {
    TestBed.tick();
    httpTesting.expectNone(() => true);
    expect(modeRanks.tables()).toEqual([]);

    modeRanks.load();
    modeRanks.load();
    TestBed.tick();
    httpTesting.expectOne(tableUrl('hiscore_oldschool_ironman')).flush(THE_FRAKING);
    httpTesting
      .expectOne(tableUrl('hiscore_oldschool_skiller_defence'))
      .flush(null, { status: 404, statusText: 'Not Found' });
    await new Promise(resolve => setTimeout(resolve));

    expect(modeRanks.tables().map(table => table.label)).toEqual(['Ironman']);
    expect(modeRanks.tables()[0].hiscore?.skills.Attack?.rank).toBe(142813);
  });
});
