import { inject, Service } from '@angular/core';
import { NavigationEnd, Router, TitleStrategy } from '@angular/router';
import { filter } from 'rxjs';
import { GTAG_TOKEN } from './gtag-token';

@Service()
export class AnalyticsService {
  private readonly gtag = inject(GTAG_TOKEN);
  private readonly router = inject(Router);
  private readonly titleStrategy = inject(TitleStrategy);

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

  /** GA4 reports show a parameter only once it's registered as a custom dimension (Admin → Custom definitions). */
  trackEvent(name: string, params: Record<string, string | number | boolean>) {
    this.gtag?.('event', name, params);
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
