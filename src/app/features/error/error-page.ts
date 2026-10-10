import { Location } from '@angular/common';
import { afterNextRender, Component, inject, RESPONSE_INIT } from '@angular/core';
import { Router } from '@angular/router';
import { BackButton } from '@app/common/components/general/back-button';
import { StatusPanel } from '@app/common/components/general/status-panel';
import { AnalyticsService } from '@app/common/services/analytics/analytics-service';

/** Shown when a page's data failed to load for a reason other than not found, see `resolverErrorHandler`. */
@Component({
  selector: 'error-page',
  imports: [BackButton, StatusPanel],
  template: `
    <main class="max-w-page mx-auto px-4 sm:px-6 pt-12 pb-18">
      <status-panel
        icon="alert"
        heading="Something went wrong"
        message="This page couldn’t be loaded. Try again in a moment."
      >
        <div class="flex flex-wrap justify-center gap-3">
          <button type="button" class="button--primary button--rounded px-8" (click)="retry()">Try again</button>
          <back-button />
        </div>
      </status-panel>
    </main>
  `,
})
export default class ErrorPage {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  constructor() {
    // Only available during SSR, `null` in the browser. A non-2xx status also keeps the page out of the page cache.
    const responseInit = inject(RESPONSE_INIT, { optional: true });
    if (responseInit) responseInit.status = 503;

    // Reported like a <load-error>, so all failures users see are counted the same way
    afterNextRender(() => this.analyticsService.trackEvent('load-error', 'errors', 'page', undefined));
  }

  /** Loads the failed page again: the address bar still shows its URL (see `resolverErrorHandler`). */
  retry(): void {
    this.router.navigateByUrl(this.location.path());
  }
}
