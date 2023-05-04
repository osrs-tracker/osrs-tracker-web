import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable } from '@angular/core';
import { GoogleAnalyticsService } from 'src/app/common/services/google-analytics.service';

@Injectable()
export class CustomErrorHandler implements ErrorHandler {
  constructor(private googleAnalyticsService: GoogleAnalyticsService) {}

  handleError(error: Error) {
    if (error instanceof HttpErrorResponse) {
      // eslint-disable-next-line no-console
      console.error(error);
    } else {
      this.googleAnalyticsService.trackException(error.message, true, error);
    }
  }
}
