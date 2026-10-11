import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter, Router, withNavigationErrorHandler } from '@angular/router';
import { WINDOW } from '@app/core/platform/window-token';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reloadOnStaleChunk, StaleChunkReloader } from './stale-chunk-reloader';

describe('StaleChunkReloader', () => {
  const chromeError = new TypeError('Failed to fetch dynamically imported module: https://example.com/chunk-OLD.js');
  let storage: Map<string, string>;
  let fakeWindow: { location: { assign: () => void; reload: () => void }; sessionStorage: Partial<Storage> };

  beforeEach(() => {
    storage = new Map();
    fakeWindow = {
      location: { assign: vi.fn(), reload: vi.fn() },
      sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLocationMocks(),
        provideRouter(
          [{ path: 'trackers/price', loadComponent: () => Promise.reject(chromeError) }],
          withNavigationErrorHandler(reloadOnStaleChunk),
        ),
        { provide: WINDOW, useValue: fakeWindow },
      ],
    });
  });

  it('opens the page a navigation was going to when its chunk is gone', async () => {
    await TestBed.inject(Router)
      .navigateByUrl('/trackers/price?q=rune')
      .catch(() => undefined);

    expect(fakeWindow.location.assign).toHaveBeenCalledExactlyOnceWith('/trackers/price?q=rune');
  });

  it("reloads the page when a @defer block's chunk is gone", () => {
    expect(TestBed.inject(StaleChunkReloader).reloadIfStale(new Error('NG0750'))).toBe(true);
    expect(fakeWindow.location.reload).toHaveBeenCalledOnce();
  });

  it('ignores other errors', () => {
    expect(TestBed.inject(StaleChunkReloader).reloadIfStale(new TypeError('Failed to fetch'))).toBe(false);
    expect(fakeWindow.location.reload).not.toHaveBeenCalled();
  });

  it("doesn't reload again right after a reload, so a chunk that stays missing can't loop", () => {
    storage.set('stale-chunk-reload', String(Date.now() - 1_000));

    expect(TestBed.inject(StaleChunkReloader).reloadIfStale(chromeError)).toBe(false);
    expect(fakeWindow.location.reload).not.toHaveBeenCalled();
  });

  it("doesn't reload when sessionStorage is blocked, as nothing would stop a loop", () => {
    fakeWindow.sessionStorage.getItem = () => {
      throw new DOMException('blocked', 'SecurityError');
    };

    expect(TestBed.inject(StaleChunkReloader).reloadIfStale(chromeError)).toBe(false);
  });
});
