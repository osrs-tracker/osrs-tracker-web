import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, RenderMode, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(withRoutes([{ path: '**', renderMode: RenderMode.Server }]))],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
