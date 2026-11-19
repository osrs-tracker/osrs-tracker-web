import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OsrsTrackerRepo } from './osrs-tracker-repo';

describe('OsrsTrackerRepo item lookups', () => {
  let repo: OsrsTrackerRepo;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(OsrsTrackerRepo);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const lookupUrls = (method: string) => http.match(r => r.method === method).map(r => r.request.urlWithParams);

  it('sends no world for the main game, so its requests stay as they were', () => {
    repo.recordItemLookup(4151).subscribe();
    repo.getRecentItemLookups().subscribe();

    expect(lookupUrls('POST')).toEqual([expect.stringMatching(/\/items\/4151\/lookup$/)]);
    expect(lookupUrls('GET')).toEqual([expect.stringMatching(/\/items\?limit=\d+$/)]);
  });

  it('adds world=hardcore for Hardcore Worlds, a different URL from the main game for the caches', () => {
    repo.recordItemLookup(4151, 'hardcore').subscribe();
    repo.getRecentItemLookups('hardcore').subscribe();

    expect(lookupUrls('POST')).toEqual([expect.stringMatching(/\/items\/4151\/lookup\?world=hardcore$/)]);
    expect(lookupUrls('GET')).toEqual([expect.stringMatching(/\/items\?limit=\d+&world=hardcore$/)]);
  });
});
