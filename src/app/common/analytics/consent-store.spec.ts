import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from './analytics-service';
import { ConsentStore } from './consent-store';
import { GTAG_TOKEN } from './gtag-token';

const TAG = 'script[src^="https://www.googletagmanager.com/gtag/js"]';

describe('ConsentStore', () => {
  let gtag: ReturnType<typeof vi.fn>;
  let store: InstanceType<typeof ConsentStore>;

  beforeEach(() => {
    gtag = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: GTAG_TOKEN, useValue: gtag }],
    });
    store = TestBed.inject(ConsentStore);
  });

  afterEach(() => {
    localStorage.clear();
    document.querySelectorAll(TAG).forEach(tag => tag.remove());
    document.cookie = '_ga=; Max-Age=0; path=/';
    delete (window as unknown as Record<string, unknown>)['ga-disable-G-PSQN8ELKNJ'];
    document.getElementById('consent-chosen')?.remove();
  });

  it('opens the banner when nothing was chosen yet', () => {
    store.init();

    expect(store.choice()).toBeNull();
    expect(store.bannerOpen()).toBe(true);
  });

  it('keeps the banner closed after an earlier choice', () => {
    localStorage.setItem('analytics-consent', 'denied');
    store.init();

    expect(store.choice()).toBe('denied');
    expect(store.bannerOpen()).toBe(false);
  });

  it('shows the banner again when reopened, although index.html hid it before the first paint', () => {
    localStorage.setItem('analytics-consent', 'granted');
    document.head.appendChild(Object.assign(document.createElement('style'), { id: 'consent-chosen' }));
    store.init();

    store.reopen();

    expect(store.bannerOpen()).toBe(true);
    expect(document.getElementById('consent-chosen')).toBeNull();
  });

  it('loads the tag once, only when allowed', () => {
    store.init();
    expect(document.querySelectorAll(TAG)).toHaveLength(0);

    store.allow();
    store.allow();

    expect(document.querySelectorAll(TAG)).toHaveLength(1);
    expect(localStorage.getItem('analytics-consent')).toBe('granted');
    expect(gtag).toHaveBeenCalledWith('consent', 'update', { analytics_storage: 'granted' });
    expect(store.bannerOpen()).toBe(false);
  });

  it('stops the tag and deletes its cookies when denied', () => {
    document.cookie = '_ga=GA1.1.123; path=/';
    store.allow();

    store.deny();

    expect((window as unknown as Record<string, unknown>)['ga-disable-G-PSQN8ELKNJ']).toBe(true);
    expect(document.cookie).not.toContain('_ga=');
    expect(localStorage.getItem('analytics-consent')).toBe('denied');
    expect(gtag).toHaveBeenLastCalledWith('consent', 'update', { analytics_storage: 'denied' });
  });

  it('lifts the opt-out when allowed again', () => {
    store.deny();
    store.allow();

    expect((window as unknown as Record<string, unknown>)['ga-disable-G-PSQN8ELKNJ']).toBeUndefined();
  });

  it('sends no events after the visitor declined', () => {
    const analyticsService = TestBed.inject(AnalyticsService);
    store.allow();
    analyticsService.trackEvent('before');

    store.deny();
    analyticsService.trackEvent('after');

    expect(gtag).toHaveBeenCalledWith('event', 'before', {});
    expect(gtag).not.toHaveBeenCalledWith('event', 'after', {});
  });
});
