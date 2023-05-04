import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ErrorHandler, importProvidersFrom, isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ServiceWorkerModule, SwUpdate } from '@angular/service-worker';
import { filter, fromEvent, startWith, switchMap } from 'rxjs';
import { AppComponent } from './app/app.component';
import appRoutes from './app/app.routes';
import { CustomErrorHandler } from './app/core/error-handling/error-handler';
import { baseUrlInterceptor } from './app/core/interceptors/base-url.interceptors';
import { loadingIndicatorInterceptor } from './app/core/interceptors/loading-indicator.interceptor';
import { shareRequestInterceptor } from './app/core/interceptors/share-request.interceptors';
import { GoogleAnalyticsService } from './app/services/google-analytics.service';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([baseUrlInterceptor, loadingIndicatorInterceptor, shareRequestInterceptor])),
    provideRouter(appRoutes),

    importProvidersFrom(
      ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: !isDevMode(),
        registrationStrategy: 'registerWhenStable:3000',
      }),
    ),

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
