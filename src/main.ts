import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ErrorHandler, isDevMode, provideExperimentalZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { SwUpdate, provideServiceWorker } from '@angular/service-worker';
import { filter, fromEvent, startWith, switchMap } from 'rxjs';
import { AppComponent } from './app/app.component';
import appRoutes from './app/app.routes';
import { GoogleAnalyticsService } from './app/common/services/google-analytics.service';
import { CustomErrorHandler } from './app/core/error-handling/error-handler';
import { baseUrlInterceptor } from './app/core/interceptors/base-url.interceptors';
import { loadingIndicatorInterceptor } from './app/core/interceptors/loading-indicator.interceptor';
import { shareRequestInterceptor } from './app/core/interceptors/share-request.interceptors';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(
      withFetch(),
      withInterceptors([baseUrlInterceptor, loadingIndicatorInterceptor, shareRequestInterceptor]),
    ),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:3000',
    }),
    provideExperimentalZonelessChangeDetection(),

    { provide: ErrorHandler, useClass: CustomErrorHandler },

    {
      provide: APP_INITIALIZER,
      deps: [GoogleAnalyticsService],
      multi: true,
      useFactory: (googleAnalyticsService: GoogleAnalyticsService) => () => googleAnalyticsService.setupPageAnalytics(),
    },
    {
      provide: APP_INITIALIZER,
      deps: [SwUpdate],
      multi: true,
      useFactory: (swUpdate: SwUpdate) => () =>
        swUpdate.isEnabled &&
        fromEvent(document, 'visibilitychange')
          .pipe(
            filter(() => document.visibilityState === 'visible'),
            startWith(null),
            switchMap(() => swUpdate.checkForUpdate()),
          )
          .subscribe(updated => updated && document.location.reload()),
    },
  ],
});
