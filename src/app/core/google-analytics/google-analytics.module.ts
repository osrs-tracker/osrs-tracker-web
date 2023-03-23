import { APP_INITIALIZER, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { GoogleAnalyticsService } from './google-analytics.service';

@NgModule({
  imports: [SharedModule, RouterModule],
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
