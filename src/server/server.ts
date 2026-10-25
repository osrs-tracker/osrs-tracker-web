import { isMainModule } from '@angular/ssr/node';
import { logOutgoingRequests } from '@osrs-tracker/logger';
import { createApp } from './app';
import { serverConfig } from './server-config';
import { autoGenerateService } from './utils/auto-generator';
import { logger, type WebLogType } from './utils/log';
import { configureGracefulShutdown } from './utils/shutdown';

// Not ready until the pages are pre-rendered, so the first visitors after a deploy get them from the page cache
const { app, metricsApp, angularApp, reqHandler } = createApp({ isReady: () => autoGenerateService.ready });

if (isMainModule(import.meta.url)) {
  logOutgoingRequests({ logger });
  const lifecycleLog = logger.child({ type: 'lifecycle' satisfies WebLogType });
  const server = app.listen(serverConfig.PORT, () => {
    lifecycleLog.info(`Node Express server listening on http://localhost:${serverConfig.PORT}`);
    autoGenerateService.initialize(angularApp);
  });
  server.keepAliveTimeout = serverConfig.keepAliveTimeout;

  const metricsServer = metricsApp.listen(serverConfig.METRICS_PORT, () => {
    lifecycleLog.info(`Metrics server listening on http://localhost:${serverConfig.METRICS_PORT}`);
  });

  configureGracefulShutdown(server, metricsServer, () => autoGenerateService.shutdown());
}

export { angularApp, app, metricsApp, reqHandler };
