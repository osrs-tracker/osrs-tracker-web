import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  provideRouter,
  RouteReuseStrategy,
  TitleStrategy,
  withComponentInputBinding,
  withInMemoryScrolling,
  withNavigationErrorHandler,
} from '@angular/router';
import appRoutes from './app.routes';
import { AnalyticsService } from './common/analytics/analytics-service';
import { PageMetaStrategy } from './common/seo/page-meta-strategy';
import { CustomErrorHandler } from './core/error-handling/error-handler';
import { baseUrlInterceptor } from './core/interceptors/base-url-interceptor';
import { loadingIndicatorInterceptor } from './core/interceptors/loading-indicator-interceptor';
import { shareRequestInterceptor } from './core/interceptors/share-request-interceptor';
import { ssrTimeoutInterceptor } from './core/interceptors/ssr-timeout-interceptor';
import { ssrUserAgentInterceptor } from './core/interceptors/ssr-user-agent-interceptor';
import { ParamAwareReuseStrategy } from './core/routing/param-aware-reuse-strategy';
import { reloadOnStaleChunk } from './core/routing/stale-chunk-reloader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([
        baseUrlInterceptor,
        loadingIndicatorInterceptor,
        shareRequestInterceptor,
        ssrUserAgentInterceptor,
        ssrTimeoutInterceptor,
      ]),
    ),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
      withNavigationErrorHandler(reloadOnStaleChunk),
    ),

    provideClientHydration(withEventReplay()),

    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),

    { provide: ErrorHandler, useClass: CustomErrorHandler },
    { provide: RouteReuseStrategy, useClass: ParamAwareReuseStrategy },
    { provide: TitleStrategy, useClass: PageMetaStrategy },

    provideAppInitializer(() => {
      const analyticsService = inject(AnalyticsService);
      analyticsService.setupPageAnalytics();
      analyticsService.setupWebVitals();
    }),
  ],
};
