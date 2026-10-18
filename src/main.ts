import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

// Without the app the server-rendered page stays as it is, so the error only needs logging
bootstrapApplication(App, appConfig).catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err);
});
