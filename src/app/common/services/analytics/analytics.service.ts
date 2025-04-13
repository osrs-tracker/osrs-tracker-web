import { Injectable, inject } from '@angular/core';
import { DefaultTitleStrategy, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { GTAG_TOKEN } from './analytics.token';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly gtag = inject(GTAG_TOKEN);
  private readonly router = inject(Router);
  private readonly titleStrategy = inject(DefaultTitleStrategy);

  setupPageAnalytics() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      const routerState = this.router.routerState.snapshot;

      this.gtag?.('event', 'page_view', {
        page_path: routerState.url,
        page_title: this.titleStrategy.buildTitle(routerState),
        page_location: location.href,
      });
    });
  }

  trackEvent(action: string, category: string, label: unknown, value: unknown) {
    this.gtag?.('event', action, {
      event_category: category,
      event_label: label,
      value,
    });
  }

  trackException(description: string, fatal = false, error?: Error) {
    // eslint-disable-next-line no-console
    console.error(error ?? description);

    this.gtag?.('event', 'exception', {
      description,
      fatal,
    });
  }
}
