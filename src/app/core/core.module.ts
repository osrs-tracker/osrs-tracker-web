import { HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, ErrorHandler, NgModule } from '@angular/core';
import { ThemeService } from '../standalone/pages/root-layout/components/dark-mode/dark-mode.service';
import { GoogleAnalyticsService } from './analytics/google-analytics.service';
import { CustomErrorHandler } from './error-handling/error-handler';
import { InterceptorsModule } from './interceptors/interceptor.module';

@NgModule({
  imports: [HttpClientModule, InterceptorsModule],
  providers: [
    { provide: ErrorHandler, useClass: CustomErrorHandler },
    // APP_INITIALIZER
    {
      provide: APP_INITIALIZER,
      useFactory: (themeService: ThemeService) => () => themeService.loadTheme(),
      deps: [ThemeService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (googleAnalyticsService: GoogleAnalyticsService) => () => {
        googleAnalyticsService.setupPageAnalytics();
      },
      multi: true,
      deps: [GoogleAnalyticsService],
    },
  ],
})
export class CoreModule {}
