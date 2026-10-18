import { Server } from 'http';
import { logger, type WebLogType } from './log';

const lifecycleLog = logger.child({ type: 'lifecycle' satisfies WebLogType });

/**
 * Shut down gracefully on SIGINT/SIGTERM: run the cleanup callback, stop accepting connections on the main server, and
 * once it has closed, close the metrics server and exit (or exit after 10 seconds). The metrics server closes last, so
 * the liveness probe keeps answering while the main server drains.
 */
export function configureGracefulShutdown(server: Server, metricsServer: Server, cleanupCallback?: () => void): void {
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.once(signal, () => {
      lifecycleLog.info(`Received ${signal}, shutting down gracefully`);

      // Execute cleanup callback if provided
      if (cleanupCallback) {
        try {
          lifecycleLog.info('Executing cleanup callback');
          cleanupCallback();
        } catch (err) {
          lifecycleLog.error({ error: err }, 'Error during cleanup');
        }
      }

      closeServers(server, metricsServer).then(
        () => {
          lifecycleLog.info('Servers closed');
          process.exit(0);
        },
        (err: unknown) => {
          lifecycleLog.error({ error: err }, 'Error while closing the servers');
          process.exit(1);
        },
      );

      // Force close after 10s
      setTimeout(() => {
        lifecycleLog.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    });
  });
}

/** Closes the main server, then the metrics server, resolving once both have closed and rejecting if either fails */
export async function closeServers(server: Server, metricsServer: Server): Promise<void> {
  // `close` only closes the connections that are idle right now. With the long keep-alive timeout, a connection whose
  // response is still being sent would then stay open, so close connections as they become idle.
  const closeIdle = setInterval(() => server.closeIdleConnections(), 100);
  try {
    await close(server);
  } finally {
    clearInterval(closeIdle);
  }
  await close(metricsServer);
}

const close = (server: Server) =>
  new Promise<void>((resolve, reject) => server.close(err => (err ? reject(err) : resolve())));
