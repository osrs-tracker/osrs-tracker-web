import { afterNextRender, Component, inject, RESPONSE_INIT } from '@angular/core';
import { BackButtonComponent } from 'src/app/common/components/general/back-button.component';
import { AnalyticsService } from 'src/app/common/services/analytics/analytics.service';

/** Shown when a page's data failed to load for a reason other than not found, see `resolverErrorHandler`. */
@Component({
  selector: 'error-page',
  imports: [BackButtonComponent],
  template: `
    <header class="container mx-auto py-48 sm:py-72">
      <h1 class="flex flex-col items-center text-center">
        <span class="text-7xl sm:text-8xl lg:text-9xl font-bold text-slate-900 dark:text-white">Oops</span>
        <span class="accent text-2xl sm:text-3xl lg:text-4xl font-bold mt-2 sm:mt-3 lg:mt-4">SOMETHING WENT WRONG</span>
      </h1>
      <div class="flex justify-center mt-8 sm:mt-12">
        <back-button />
      </div>
    </header>
  `,
})
export default class ErrorComponent {
  private readonly analyticsService = inject(AnalyticsService);

  constructor() {
    // Only available during SSR, `null` in the browser. A non-2xx status also keeps the page out of the page cache.
    const responseInit = inject(RESPONSE_INIT, { optional: true });
    if (responseInit) responseInit.status = 503;

    // Reported like a <load-error>, so all failures users see are counted the same way
    afterNextRender(() => this.analyticsService.trackEvent('load-error', 'errors', 'page', undefined));
  }
}
