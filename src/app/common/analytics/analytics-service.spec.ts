import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from './analytics-service';
import { GTAG_TOKEN } from './gtag-token';

describe('AnalyticsService', () => {
  function setup(gtag: ReturnType<typeof vi.fn> | null) {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: GTAG_TOKEN, useValue: gtag }],
    });
    const service = TestBed.inject(AnalyticsService);
    const send = vi.spyOn(service as unknown as { send: AnalyticsService['trackEvent'] }, 'send');
    service.setupPageAnalytics();
    return { send };
  }

  afterEach(() => localStorage.clear());

  it('sends a page view after a navigation', async () => {
    const { send } = setup(vi.fn());

    await TestBed.inject(Router).navigateByUrl('/');

    expect(send).toHaveBeenCalledWith('page_view', expect.objectContaining({ page_path: '/' }));
  });

  // The server has no gtag and no `location`: reading `location.href` there threw on every render
  it('does nothing on a navigation without gtag, as on the server', async () => {
    const { send } = setup(null);

    await TestBed.inject(Router).navigateByUrl('/');

    expect(send).not.toHaveBeenCalled();
  });
});
