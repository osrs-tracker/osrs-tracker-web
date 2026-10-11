import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Service, inject } from '@angular/core';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { StaleChunkReloader } from '../routing/stale-chunk-reloader';

/**
 * Reports uncaught errors to analytics. Failed requests are only logged: the ones users see are shown with
 * `<load-error>` or the error page, which report themselves. A chunk from before a deploy that's gone reloads the page
 * instead (a `@defer` block's, or a navigation's that the router rethrows).
 */
@Service({ autoProvided: false })
export class CustomErrorHandler implements ErrorHandler {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly staleChunkReloader = inject(StaleChunkReloader);

  // Angular passes whatever was thrown, which isn't always an Error
  handleError(error: unknown): void {
    if (this.staleChunkReloader.reloadIfStale(error)) return;

    if (error instanceof HttpErrorResponse) {
      // eslint-disable-next-line no-console
      console.error(error);
    } else if (error instanceof Error) {
      this.analyticsService.trackException(error.message, true, error);
    } else {
      this.analyticsService.trackException(String(error), true);
    }
  }
}
