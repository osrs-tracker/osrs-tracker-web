/* eslint-disable no-console */
import { Server } from 'http';

/**
 * Shut down gracefully on SIGINT/SIGTERM: run the cleanup callback, stop accepting connections on the main server, and
 * once it has closed, close the metrics server and exit (or exit after 10 seconds). The metrics server closes last, so
 * the liveness probe keeps answering while the main server drains.
 */
export function configureGracefulShutdown(server: Server, metricsServer: Server, cleanupCallback?: () => void): void {
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.once(signal, () => {
      console.log(`Received ${signal}, shutting down gracefully`);

      // Execute cleanup callback if provided
      if (cleanupCallback) {
        try {
          console.log('Executing cleanup callback');
          cleanupCallback();
        } catch (err) {
          console.error('Error during cleanup:', err);
        }
      }

      closeServers(server, metricsServer).then(() => {
        console.log('Servers closed');
        process.exit(0);
      });

      // Force close after 10s
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    });
  });
}

/** Closes the main server, then the metrics server, resolving once both have closed */
export async function closeServers(server: Server, metricsServer: Server): Promise<void> {
  // `close` only closes the connections that are idle right now. With the long keep-alive timeout, a connection whose
  // response is still being sent would then stay open, so close connections as they become idle.
  const closeIdle = setInterval(() => server.closeIdleConnections(), 100);
  await new Promise(resolve => server.close(resolve));
  clearInterval(closeIdle);
  await new Promise(resolve => metricsServer.close(resolve));
}
