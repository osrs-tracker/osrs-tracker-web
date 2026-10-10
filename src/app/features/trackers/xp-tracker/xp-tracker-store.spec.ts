import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StorageKey } from '@app/common/services/storage/storage';
import { afterEach, describe, expect, it } from 'vitest';
import { XpTrackerStore } from './xp-tracker-store';

describe('XpTrackerStore', () => {
  function createStore(stored: Partial<Record<StorageKey, string>>): InstanceType<typeof XpTrackerStore> {
    Object.entries(stored).forEach(([key, value]) => localStorage.setItem(key, value));
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    return TestBed.inject(XpTrackerStore);
  }

  afterEach(() => localStorage.clear());

  it('loads the stored state', () => {
    const store = createStore({
      [StorageKey.XpTrackerRecentPlayers]: '["ToxSick"]',
      [StorageKey.XpTrackerFavoritePlayers]: '["the fraking"]',
      [StorageKey.XpTrackerScrapingOffset]: '2',
    });

    expect(store.recentPlayers()).toEqual(['ToxSick']);
    expect(store.favoritePlayers()).toEqual(['the fraking']);
    expect(store.scrapingOffset()).toBe(2);
  });

  it('falls back to the defaults when the stored state is corrupt', () => {
    const store = createStore({
      [StorageKey.XpTrackerRecentPlayers]: '["ToxSick"',
      [StorageKey.XpTrackerFavoritePlayers]: '{"0":"ToxSick"}',
      [StorageKey.XpTrackerScrapingOffset]: 'abc',
    });

    expect(store.recentPlayers()).toEqual([]);
    expect(store.favoritePlayers()).toEqual([]);
    expect(store.scrapingOffset()).toBe(0);
  });
});
