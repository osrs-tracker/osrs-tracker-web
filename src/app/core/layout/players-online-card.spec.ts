import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { PlayersOnlineCard } from './players-online-card';

const count = (total: number, date: string): object => ({
  date,
  total,
  members: total,
  f2p: 0,
  worlds: 1,
  byLocation: {},
});

/** Lets resource values land: a resource takes a response's value after a macrotask */
const settle = async (): Promise<void> => {
  TestBed.tick();
  await new Promise(resolve => setTimeout(resolve));
  TestBed.tick();
};

describe('PlayersOnlineCard', () => {
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('draws the stored samples, dotting a repeat, and shows the live count only as the number', async () => {
    const fixture = TestBed.createComponent(PlayersOnlineCard);
    fixture.componentRef.setInput('active', true);
    await settle();
    httpTesting
      .expectOne(request => request.url === '/player-counts')
      .flush([
        count(100, '2026-11-09T17:15:00Z'),
        count(90, '2026-11-09T17:25:00Z'),
        count(90, '2026-11-09T17:35:00Z'),
      ]);
    httpTesting.expectOne('/player-counts/latest').flush(count(90, '2026-11-09T17:35:00Z'));
    httpTesting.expectOne('/player-counts/live').flush(count(130, '2026-11-09T17:41:00Z'));
    await settle();

    const card = fixture.componentInstance;
    expect(card.paths()?.line.match(/L/g)).toHaveLength(2);
    expect(card.paths()?.solid).toMatch(/^M\S+ \S+ L\S+ \S+$/);
    expect(card.paths()?.dotted).toMatch(/^M\S+ \S+ L\S+ \S+$/);
    expect(fixture.nativeElement.textContent).toContain('130');
  });

  it('says when the live count repeats a count read five minutes before it', async () => {
    const fixture = TestBed.createComponent(PlayersOnlineCard);
    fixture.componentRef.setInput('active', true);
    await settle();
    httpTesting.expectOne(request => request.url === '/player-counts').flush([count(90, '2026-11-09T17:35:00Z')]);
    httpTesting.expectOne('/player-counts/latest').flush(count(90, '2026-11-09T17:35:00Z'));
    httpTesting.expectOne('/player-counts/live').flush(count(90, '2026-11-09T17:41:00Z'));
    await settle();

    expect(fixture.componentInstance.frozen()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Possible game outage');
  });
});
