/* eslint-disable no-console */
import { isMainModule } from '@angular/ssr/node';
import bootstrap from '../main.server';
import { createApp } from './app';
import { serverConfig } from './server-config';
import { autoGenerateService } from './utils/auto-generator';
import { configureGracefulShutdown } from './utils/shutdown';

const { app, metricsApp } = createApp(bootstrap);

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 8080.
 */
if (isMainModule(import.meta.url)) {
  const server = app.listen(serverConfig.PORT, () => {
    console.log(`Node Express server listening on http://localhost:${serverConfig.PORT}`);

    autoGenerateService.initialize(bootstrap); // Initialize auto-generation of pages
  });

  configureGracefulShutdown(server, () => {
    autoGenerateService.shutdown(); // Clean up auto-generation service during shutdown
  });

  const metricsServer = metricsApp.listen(serverConfig.METRICS_PORT, () => {
    console.log(`Metrics server listening on http://localhost:${serverConfig.METRICS_PORT}`);
  });

  configureGracefulShutdown(metricsServer);
}

export default { app, metricsApp };
