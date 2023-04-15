import { ErrorHandler, Injectable } from '@angular/core';
import { GoogleAnalyticsService } from '../analytics/google-analytics.service';

@Injectable()
export class CustomErrorHandler implements ErrorHandler {
  constructor(private googleAnalyticsService: GoogleAnalyticsService) {}

  handleError(error: Error) {
    this.googleAnalyticsService.trackException(error.message, true, error);
  }
}
