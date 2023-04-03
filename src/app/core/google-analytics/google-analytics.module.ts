import { CommonModule } from '@angular/common';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GoogleAnalyticsService } from './google-analytics.service';

@NgModule({
  imports: [CommonModule, RouterModule],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: (googleAnalyticsService: GoogleAnalyticsService) => () => googleAnalyticsService.setupPageAnalytics(),
      multi: true,
      deps: [GoogleAnalyticsService],
    },
  ],
})
export class GoogleAnalyticsModule {}
