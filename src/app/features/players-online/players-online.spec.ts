import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PlayerCount } from '@osrs-tracker/models';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { GTAG_TOKEN } from '@app/common/analytics/gtag-token';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import PlayersOnline from './players-online';

const count = (hardcore?: number): PlayerCount => ({
  date: new Date(Date.UTC(2026, 10, 19, 17)),
  total: 90_000,
  members: 70_000,
  f2p: 20_000,
  worlds: 353,
  byLocation: {},
  ...(hardcore === undefined ? {} : { hardcore }),
});

async function render(live: PlayerCount): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: GTAG_TOKEN, useValue: null },
      {
        provide: OsrsTrackerRepo,
        useValue: {
          getLatestPlayerCount: () => of(count()),
          getLivePlayerCount: () => of(live),
          getPlayerCountHistory: () => of([]),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(PlayersOnline);
  await fixture.whenStable();
  return fixture.nativeElement;
}

const hardcoreSegment = (root: HTMLElement): HTMLElement | null =>
  root.querySelector<HTMLElement>('[aria-hidden="true"] .bg-sold');

const hardcoreLine = (root: HTMLElement): string | undefined =>
  [...root.querySelectorAll('p')]
    .find(line => line.textContent!.includes('Hardcore Worlds'))
    ?.textContent!.replace(/\s+/g, ' ')
    .trim();

describe('PlayersOnline', () => {
  it('shows the players on Hardcore Worlds as the end of the Members bar, with a key under it', async () => {
    const root = await render(count(6_300));

    expect(hardcoreSegment(root)?.style.width).toBe('9%');
    expect(hardcoreLine(root)).toBe('Hardcore Worlds 6,300 7% of all players');
  });

  it('shows a count of 0 on Hardcore Worlds', async () => {
    const root = await render(count(0));

    expect(hardcoreSegment(root)?.style.width).toBe('0%');
    expect(hardcoreLine(root)).toBe('Hardcore Worlds 0 0% of all players');
  });

  it('leaves the segment and its key out while the count has no Hardcore Worlds number', async () => {
    const root = await render(count());

    expect(root.textContent).toContain('90,000');
    expect(hardcoreSegment(root)).toBeNull();
    expect(hardcoreLine(root)).toBeUndefined();
  });
});
