import express, { Router } from 'express';
import { join } from 'node:path';
import { serverConfig } from '../server-config';

export function createNoCacheHeadersRouter(): Router {
  const router = express.Router();

  // Add no-cache headers for specific files that will be served by the static middleware
  serverConfig.noCacheStaticFiles.forEach(file => {
    router.get(file, (req, res, next) => {
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });

      // Override the service worker with safety-worker.js
      if (file === '/ngsw-worker.js') {
        return res.sendFile(join(serverConfig.browserDistFolder, 'safety-worker.js'));
      }
      next();
    });
  });

  return router;
}
