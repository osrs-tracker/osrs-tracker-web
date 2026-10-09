import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, RenderMode, withRoutes } from '@angular/ssr';
import { serverConfig } from 'src/server/server-config';
import { appConfig } from './app.config';
import { provideInternalApiBaseUrl } from './core/interceptors/base-url.interceptors';
import { provideSsrRequestTimeout } from './core/interceptors/ssr-timeout.interceptor';

const serverAppConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes([{ path: '**', renderMode: RenderMode.Server }])),
    serverConfig.API_INTERNAL_URL ? provideInternalApiBaseUrl(serverConfig.API_INTERNAL_URL) : [],
    provideSsrRequestTimeout(serverConfig.ssrRequestTimeout),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverAppConfig);
