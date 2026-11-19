import { inject, Service } from '@angular/core';
import { NavigationEnd, Router, TitleStrategy } from '@angular/router';
import { filter } from 'rxjs';
import type { Metric } from 'web-vitals';
import type { PriceWorld } from '../api/price-world';
import { ConsentStore } from './consent-store';
import { GTAG_TOKEN } from './gtag-token';

@Service()
export class AnalyticsService {
  private readonly gtag = inject(GTAG_TOKEN);
  private readonly consentStore = inject(ConsentStore);
  private readonly router = inject(Router);
  private readonly titleStrategy = inject(TitleStrategy);

  setupPageAnalytics() {
    if (!this.gtag) return;

    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      const routerState = this.router.routerState.snapshot;

      this.send('page_view', {
        page_path: routerState.url,
        page_title: this.titleStrategy.buildTitle(routerState),
        page_location: location.href,
      });
    });
  }

  /** Covers the page the visit landed on, not the pages the app navigates to after it. */
  setupWebVitals() {
    if (!this.gtag) return;

    void import('web-vitals')
      .then(({ onCLS, onINP, onLCP }) => {
        const send = ({ name, value, rating }: Metric) =>
          this.trackEvent('web_vitals', {
            metric_name: name,
            // CLS is a score (0.1 is good), LCP and INP are milliseconds
            metric_value: name === 'CLS' ? Math.round(value * 1000) / 1000 : Math.round(value),
            metric_rating: rating,
          });

        onCLS(send);
        onINP(send);
        onLCP(send);
      })
      .catch(() => {
        // Not worth an error report or a stale chunk reload: the page works without it
      });
  }

  /**
   * GA4 reports show a parameter only once it's registered as a custom dimension (Admin → Custom definitions). Keep
   * names snake_case and values to a small set, except `search_term`. Never name one `source`: GA4 reads it as the
   * session's traffic source.
   */
  trackEvent(name: string, params: Record<string, string | number | boolean> = {}) {
    this.send(name, params);
  }

  /** `search_term` lowercased, as player and item names don't depend on case. `world` for the price pages. */
  trackSearch(type: 'player' | 'item', term: string, results?: number, world?: PriceWorld) {
    this.trackEvent('search', {
      search_term: term.trim().toLowerCase(),
      search_type: type,
      ...(results !== undefined ? { results } : {}),
      ...(world ? { world } : {}),
    });
  }

  /**
   * A choice in a control (a period, a tab, a mode): one event for every control, so it takes two custom dimensions.
   * `world` for the price pages, which exist for the main game and Hardcore Worlds.
   */
  trackOption(control: string, option: string | number, world?: PriceWorld) {
    this.trackEvent('select_option', { control, option: String(option), ...(world ? { world } : {}) });
  }

  trackException(description: string, fatal = false, error?: Error) {
    // eslint-disable-next-line no-console
    console.error(error ?? description);

    this.send('exception', {
      description,
      fatal,
    });
  }

  /**
   * Nothing is pushed once the visitor declined: if they allowed it earlier on this page, the tag still runs, and an
   * event pushed after the click (web-vitals reports LCP in an idle callback after it) would still reach Google
   */
  private send(name: string, params: Gtag.CustomParams) {
    if (this.consentStore.choice() === 'denied') return;
    this.gtag?.('event', name, params);
  }
}
