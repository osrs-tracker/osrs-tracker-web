import { HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, ErrorHandler, NgModule } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { ThemeService } from '../services/theme.service';
import { GoogleAnalyticsService } from './analytics/google-analytics.service';
import { CustomErrorHandler } from './error-handling/error-handler';
import { InterceptorsModule } from './interceptors/interceptor.module';

@NgModule({
  imports: [HttpClientModule, InterceptorsModule],
  providers: [
    { provide: ErrorHandler, useClass: CustomErrorHandler },
    {
      provide: APP_INITIALIZER,
      deps: [SwUpdate],
      useFactory: (swUpdate: SwUpdate) => () => {
        if (!swUpdate.isEnabled) return;
        swUpdate.checkForUpdate().then(updated => updated && document.location.reload());
      },
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      deps: [ThemeService],
      useFactory: (themeService: ThemeService) => () => themeService.loadTheme(),
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      deps: [GoogleAnalyticsService],
      useFactory: (googleAnalyticsService: GoogleAnalyticsService) => () => googleAnalyticsService.setupPageAnalytics(),
      multi: true,
    },
  ],
})
export class CoreModule {}
