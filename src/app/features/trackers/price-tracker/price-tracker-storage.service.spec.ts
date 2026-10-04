import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StorageKey } from 'src/app/common/services/storage/storage';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PriceTrackerStorageService, RecentItem } from './price-tracker-storage.service';

describe('PriceTrackerStorageService', () => {
  const whip: RecentItem = { id: 4151, name: 'Abyssal whip', icon: 'Abyssal whip.png' };
  let service: PriceTrackerStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    service = TestBed.inject(PriceTrackerStorageService);
  });
  afterEach(() => localStorage.clear());

  it.each(['[{"id":4151', '{"id":4151}', 'null'])('ignores corrupt stored items (%s)', stored => {
    localStorage.setItem(StorageKey.PriceTrackerRecentItems, stored);
    localStorage.setItem(StorageKey.PriceTrackerFavoriteItems, stored);

    expect(service.getRecentItems()).toEqual([]);
    expect(service.isFavoriteItem(whip.id)).toBe(false);

    service.pushRecentItem(whip);
    service.toggleFavoriteItem(whip);

    expect(service.getRecentItems()).toEqual([whip]);
    expect(service.isFavoriteItem(whip.id)).toBe(true);
  });
});
