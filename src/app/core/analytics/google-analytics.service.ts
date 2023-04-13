import { Injectable } from '@angular/core';
import { DefaultTitleStrategy, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GoogleAnalyticsService {
  private readonly GTAG_ID = 'G-PSQN8ELKNJ';

  constructor(private router: Router, private titleStrategy: DefaultTitleStrategy) {}

  setupPageAnalytics() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      const routerState = this.router.routerState.snapshot;

      gtag('event', 'page_view', {
        page_path: routerState.url,
        page_title: this.titleStrategy.buildTitle(routerState),
        page_location: window.location.href,
      });
    });
  }

  trackEvent(action: string, category: string, label: string, value?: number) {
    gtag('event', action, {
      event_category: category,
      event_label: label,
      value,
    });
  }

  trackException(description: string, fatal: boolean) {
    gtag('event', 'exception', {
      description,
      fatal,
    });
  }
}
