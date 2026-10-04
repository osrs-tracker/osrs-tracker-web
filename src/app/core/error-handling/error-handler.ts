import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Service, inject } from '@angular/core';
import { AnalyticsService } from 'src/app/common/services/analytics/analytics.service';

/**
 * Reports uncaught errors to analytics. Failed requests are only logged: the ones users see are shown with
 * `<load-error>` or the error page, which report themselves.
 */
@Service({ autoProvided: false })
export class CustomErrorHandler implements ErrorHandler {
  private readonly analyticsService = inject(AnalyticsService);

  // Angular passes whatever was thrown, which isn't always an Error
  handleError(error: unknown): void {
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
