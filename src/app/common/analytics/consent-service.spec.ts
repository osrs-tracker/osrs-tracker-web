import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from './analytics-service';
import { ConsentService } from './consent-service';
import { GTAG_TOKEN } from './gtag-token';

const TAG = 'script[src^="https://www.googletagmanager.com/gtag/js"]';

describe('ConsentService', () => {
  let gtag: ReturnType<typeof vi.fn>;
  let service: ConsentService;

  beforeEach(() => {
    gtag = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: GTAG_TOKEN, useValue: gtag }],
    });
    service = TestBed.inject(ConsentService);
  });

  afterEach(() => {
    localStorage.clear();
    document.querySelectorAll(TAG).forEach(tag => tag.remove());
    document.cookie = '_ga=; Max-Age=0; path=/';
    delete (window as unknown as Record<string, unknown>)['ga-disable-G-PSQN8ELKNJ'];
  });

  it('opens the banner when nothing was chosen yet', () => {
    service.init();

    expect(service.choice()).toBeNull();
    expect(service.bannerOpen()).toBe(true);
  });

  it('keeps the banner closed after an earlier choice', () => {
    localStorage.setItem('analytics-consent', 'denied');
    service.init();

    expect(service.choice()).toBe('denied');
    expect(service.bannerOpen()).toBe(false);
  });

  it('loads the tag once, only when allowed', () => {
    service.init();
    expect(document.querySelectorAll(TAG)).toHaveLength(0);

    service.allow();
    service.allow();

    expect(document.querySelectorAll(TAG)).toHaveLength(1);
    expect(localStorage.getItem('analytics-consent')).toBe('granted');
    expect(gtag).toHaveBeenCalledWith('consent', 'update', { analytics_storage: 'granted' });
    expect(service.bannerOpen()).toBe(false);
  });

  it('stops the tag and deletes its cookies when denied', () => {
    document.cookie = '_ga=GA1.1.123; path=/';
    service.allow();

    service.deny();

    expect((window as unknown as Record<string, unknown>)['ga-disable-G-PSQN8ELKNJ']).toBe(true);
    expect(document.cookie).not.toContain('_ga=');
    expect(localStorage.getItem('analytics-consent')).toBe('denied');
    expect(gtag).toHaveBeenLastCalledWith('consent', 'update', { analytics_storage: 'denied' });
  });

  it('lifts the opt-out when allowed again', () => {
    service.deny();
    service.allow();

    expect((window as unknown as Record<string, unknown>)['ga-disable-G-PSQN8ELKNJ']).toBeUndefined();
  });

  it('sends no events after the visitor declined', () => {
    const analyticsService = TestBed.inject(AnalyticsService);
    service.allow();
    analyticsService.trackEvent('before');

    service.deny();
    analyticsService.trackEvent('after');

    expect(gtag).toHaveBeenCalledWith('event', 'before', {});
    expect(gtag).not.toHaveBeenCalledWith('event', 'after', {});
  });
});
