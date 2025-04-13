import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { AnalyticsService } from 'src/app/common/services/analytics/analytics.service';

@Injectable()
export class CustomErrorHandler implements ErrorHandler {
  private readonly analyticsService = inject(AnalyticsService);

  handleError(error: Error) {
    if (error instanceof HttpErrorResponse) {
      // eslint-disable-next-line no-console
      console.error(error);
    } else {
      this.analyticsService.trackException(error.message, true, error);
    }
  }
}
