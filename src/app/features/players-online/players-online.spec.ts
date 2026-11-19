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

/** Each split under the count: its two parts' text and the first part's width in the bar */
const splits = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('[aria-hidden="true"].h-2')].map(bar => ({
    parts: [...bar.parentElement!.querySelectorAll('.justify-between > span')].map(part =>
      part.textContent!.replace(/\s+/g, ' ').trim(),
    ),
    percent: bar.querySelector<HTMLElement>('span')!.style.width,
  }));

describe('PlayersOnline', () => {
  it('splits the total into the main game and Hardcore Worlds, above members and free-to-play', async () => {
    expect(splits(await render(count(6_300)))).toEqual([
      { parts: ['Main game 83,700 93%', 'Hardcore Worlds 6,300 7%'], percent: '93%' },
      { parts: ['Members 70,000 78%', 'Free-to-play 20,000 22%'], percent: expect.stringMatching(/^77\.7+9?%$/) },
    ]);
  });

  it('shows a count of 0 on Hardcore Worlds, with no violet in its bar', async () => {
    const [worldType] = splits(await render(count(0)));

    expect(worldType).toEqual({ parts: ['Main game 90,000 100%', 'Hardcore Worlds 0 0%'], percent: '100%' });
  });

  it('shows only members and free-to-play while the count has no Hardcore Worlds number', async () => {
    const root = await render(count());

    expect(root.textContent).toContain('90,000');
    expect(splits(root).map(split => split.parts)).toEqual([['Members 70,000 78%', 'Free-to-play 20,000 22%']]);
    expect(root.textContent).not.toContain('Hardcore Worlds');
  });
});
