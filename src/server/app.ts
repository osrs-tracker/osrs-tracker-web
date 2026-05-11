import { AngularNodeAppEngine, createNodeRequestHandler, writeResponseToNodeResponse } from '@angular/ssr/node';
import compression from 'compression';
import express, { Router } from 'express';
import { angularCacheMiddleware } from './middleware/angular-cache';
import { loggingMiddleware } from './middleware/logging';
import { metricsMiddleware } from './middleware/metrics';
import { securityMiddleware } from './middleware/security';
import { createHealthRouter } from './routers/health';
import { createNoCacheHeadersRouter } from './routers/no-cache-files';
import { serverConfig } from './server-config';

export function createApp() {
  const app = express();
  const metricsApp = express();
  const angularApp = new AngularNodeAppEngine({ allowedHosts: [serverConfig.HOST] });

  app.use(
    metricsMiddleware(metricsApp), // Set up Monitoring
    loggingMiddleware(), // Add request logging
    securityMiddleware(), // Add security headers
    compression(), // Add compression for better performance
    createNoCacheHeadersRouter(), // No-cache headers for critical static files
    angularCacheMiddleware(), // Cache rendered pages in memory for faster subsequent responses
  );

  app.use(express.static(serverConfig.browserDistFolder, { maxAge: '30d' }));

  app.use('*', (req, res, next) => {
    angularApp.handle(req).then(response => {
      if (response) {
        writeResponseToNodeResponse(response, res);
      } else {
        next();
      }
    });
  });

  metricsApp.use(
    Router().use('/healthy', createHealthRouter()), // Health check endpoint
  );

  return { app, metricsApp, angularApp, reqHandler: createNodeRequestHandler(app) };
}
