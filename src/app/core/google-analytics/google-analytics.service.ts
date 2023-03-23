import { Injectable } from '@angular/core';
import { DefaultTitleStrategy, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GoogleAnalyticsService {
  constructor(private router: Router, private titleStrategy: DefaultTitleStrategy) {}

  setupPageAnalytics() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      const routerState = this.router.routerState.snapshot;

      gtag('event', 'page_view', {
        page_path: routerState.url,
        page_title: this.titleStrategy.buildTitle(routerState),
      });
    });
  }
}
