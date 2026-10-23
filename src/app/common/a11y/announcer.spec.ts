import { LiveAnnouncer } from '@angular/cdk/a11y';
import { PLATFORM_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANNOUNCE_DELAY, Announcer, announceChanges } from './announcer';

describe('announceChanges', () => {
  let announce: ReturnType<typeof vi.fn>;
  const message = signal<string | null>('Showing 25 of 1,466 items.');

  function start(platform = 'browser'): void {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: LiveAnnouncer, useValue: { announce } },
      ],
    });
    TestBed.runInInjectionContext(() => announceChanges(message));
    TestBed.tick();
  }

  function change(text: string | null, wait = ANNOUNCE_DELAY): void {
    message.set(text);
    TestBed.tick();
    vi.advanceTimersByTime(wait);
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    announce = vi.fn(() => Promise.resolve());
    message.set('Showing 25 of 1,466 items.');
  });

  afterEach(() => vi.useRealTimers());

  it("doesn't read the message the page loaded with", () => {
    start();
    vi.advanceTimersByTime(ANNOUNCE_DELAY);

    expect(announce).not.toHaveBeenCalled();
  });

  it('reads a new message once it stayed for the delay, and only the last of quick changes', () => {
    start();
    change('Showing 3 of 3 items matching “w”.', 100);
    change('Showing 1 of 1 item matching “wh”.', ANNOUNCE_DELAY - 1);
    expect(announce).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(announce).toHaveBeenCalledExactlyOnceWith('Showing 1 of 1 item matching “wh”.');
  });

  it('stays silent while there is nothing to say, and reads the same message again after it', () => {
    start();
    change(null);
    expect(announce).not.toHaveBeenCalled();

    change('Showing 25 of 1,466 items.');
    expect(announce).toHaveBeenCalledExactlyOnceWith('Showing 25 of 1,466 items.');
  });

  it('reads nothing on the server', () => {
    start('server');
    change('No items match these filters.');

    expect(announce).not.toHaveBeenCalled();
    expect(TestBed.inject(Announcer)).toBeTruthy();
  });
});
