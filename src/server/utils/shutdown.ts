/* eslint-disable no-console */
import { Server } from 'http';

/**
 * Shut down gracefully on SIGINT/SIGTERM: run the cleanup callback, stop accepting connections on all servers, and exit
 * once every server has closed (or after 10 seconds).
 */
export function configureGracefulShutdown(servers: Server[], cleanupCallback?: () => void): void {
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

      Promise.all(servers.map(server => new Promise(resolve => server.close(resolve)))).then(() => {
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
