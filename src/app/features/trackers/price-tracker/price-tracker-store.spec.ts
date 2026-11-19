import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StorageKey } from '@app/common/storage/storage';
import { afterEach, describe, expect, it } from 'vitest';
import { PriceTrackerStore, RecentItem } from './price-tracker-store';

describe('PriceTrackerStore', () => {
  const whip: RecentItem = { id: 4151, name: 'Abyssal whip', icon: 'Abyssal whip.png' };

  function createStore(stored: Partial<Record<StorageKey, string>>): InstanceType<typeof PriceTrackerStore> {
    Object.entries(stored).forEach(([key, value]) => localStorage.setItem(key, value));
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    return TestBed.inject(PriceTrackerStore);
  }

  afterEach(() => localStorage.clear());

  it.each(['[{"id":4151', '{"id":4151}', 'null'])('ignores corrupt stored items (%s)', stored => {
    const store = createStore({
      [StorageKey.PriceTrackerRecentItems]: stored,
      [StorageKey.PriceTrackerFavoriteItems]: stored,
    });

    expect(store.recentItems().main).toEqual([]);
    expect(store.isFavoriteItem(whip.id)).toBe(false);

    store.pushRecentItem(whip);
    store.toggleFavoriteItem(whip);

    expect(store.recentItems().main).toEqual([whip]);
    expect(store.isFavoriteItem(whip.id)).toBe(true);
    expect(JSON.parse(localStorage.getItem(StorageKey.PriceTrackerFavoriteItems)!)).toEqual([whip]);
  });

  it('keeps recent items per world, and favourites in one list', () => {
    const store = createStore({ [StorageKey.PriceTrackerHardcoreRecentItems]: JSON.stringify([whip]) });

    expect(store.recentItems()).toEqual({ main: [], hardcore: [whip] });

    store.pushRecentItem({ ...whip, id: 1 }, 'hardcore');
    store.pushRecentItem({ ...whip, id: 2 });

    expect(store.recentItems().hardcore.map(item => item.id)).toEqual([1, 4151]);
    expect(store.recentItems().main.map(item => item.id)).toEqual([2]);
    expect(JSON.parse(localStorage.getItem(StorageKey.PriceTrackerRecentItems)!)).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(StorageKey.PriceTrackerHardcoreRecentItems)!)).toHaveLength(2);

    store.toggleFavoriteItem(whip);
    expect(localStorage.getItem(StorageKey.PriceTrackerHardcoreRecentItems)).not.toBe(
      localStorage.getItem(StorageKey.PriceTrackerFavoriteItems),
    );
  });
});
