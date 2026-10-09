/* eslint-disable no-console */
import { isMainModule } from '@angular/ssr/node';
import { createApp } from './app';
import { serverConfig } from './server-config';
import { autoGenerateService } from './utils/auto-generator';
import { configureGracefulShutdown } from './utils/shutdown';

// Not ready until the pages are pre-rendered, so the first visitors after a deploy get them from the page cache
const { app, metricsApp, angularApp, reqHandler } = createApp({ isReady: () => autoGenerateService.ready });

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 8080.
 */
if (isMainModule(import.meta.url)) {
  const server = app.listen(serverConfig.PORT, () => {
    console.log(`Node Express server listening on http://localhost:${serverConfig.PORT}`);
    autoGenerateService.initialize(angularApp); // Initialize auto-generation of pages
  });
  server.keepAliveTimeout = serverConfig.keepAliveTimeout;

  const metricsServer = metricsApp.listen(serverConfig.METRICS_PORT, () => {
    console.log(`Metrics server listening on http://localhost:${serverConfig.METRICS_PORT}`);
  });

  configureGracefulShutdown(server, metricsServer, () => autoGenerateService.shutdown());
}

export { angularApp, app, metricsApp, reqHandler };
