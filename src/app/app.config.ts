import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  isDevMode,
  provideAppInitializer,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker, SwUpdate } from '@angular/service-worker';
import { filter, fromEvent, startWith, switchMap } from 'rxjs';
import appRoutes from './app.routes';
import { GoogleAnalyticsService } from './common/services/google-analytics.service';
import { CustomErrorHandler } from './core/error-handling/error-handler';
import { baseUrlInterceptor } from './core/interceptors/base-url.interceptors';
import { loadingIndicatorInterceptor } from './core/interceptors/loading-indicator.interceptor';
import { shareRequestInterceptor } from './core/interceptors/share-request.interceptors';

export const appConfig: ApplicationConfig = {
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

    provideAppInitializer(() => inject(GoogleAnalyticsService).setupPageAnalytics()),
    provideAppInitializer(() => {
      const swUpdate = inject(SwUpdate);

      if (swUpdate.isEnabled) {
        fromEvent(document, 'visibilitychange')
          .pipe(
            filter(() => document.visibilityState === 'visible'),
            startWith(null),
            switchMap(() => swUpdate.checkForUpdate()),
          )
          .subscribe(updated => updated && document.location.reload());
      }
    }),
  ],
};
