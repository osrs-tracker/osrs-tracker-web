import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StorageKey } from 'src/app/common/services/storage/storage';
import { afterEach, describe, expect, it } from 'vitest';
import { PriceTrackerStore, RecentItem } from './price-tracker.store';

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

    expect(store.recentItems()).toEqual([]);
    expect(store.isFavoriteItem(whip.id)).toBe(false);

    store.pushRecentItem(whip);
    store.toggleFavoriteItem(whip);

    expect(store.recentItems()).toEqual([whip]);
    expect(store.isFavoriteItem(whip.id)).toBe(true);
    expect(JSON.parse(localStorage.getItem(StorageKey.PriceTrackerFavoriteItems)!)).toEqual([whip]);
  });
});
