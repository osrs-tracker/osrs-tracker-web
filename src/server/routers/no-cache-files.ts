import express, { Router } from 'express';
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

      next();
    });
  });

  return router;
}
