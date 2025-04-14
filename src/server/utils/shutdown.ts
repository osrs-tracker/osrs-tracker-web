/* eslint-disable no-console */
import { Server } from 'http';

export function configureGracefulShutdown(server: Server, cleanupCallback?: () => void): void {
  // Handle graceful shutdown
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
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

      server.close(() => {
        console.log('Server closed');
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
