import { ApplicationRef } from '@angular/core';
import compression from 'compression';
import express, { Router } from 'express';
import { angularSsrMiddleware } from './middleware/angular-ssr';
import { loggingMiddleware } from './middleware/logging';
import { metricsMiddleware } from './middleware/metrics';
import { securityMiddleware } from './middleware/security';
import { createHealthRouter } from './routers/health';
import { createNoCacheHeadersRouter } from './routers/no-cache-files';
import { serverConfig } from './server-config';

export function createApp(bootstrap: () => Promise<ApplicationRef>) {
  const app = express();
  const metricsApp = express();

  app.use(
    metricsMiddleware(metricsApp), // Set up Monitoring
    loggingMiddleware(), // Add request logging
    securityMiddleware(), // Add security headers
    compression(), // Add compression for better performance
    createNoCacheHeadersRouter(), // No-cache headers for critical static files
  );

  app.use(express.static(serverConfig.browserDistFolder, { maxAge: '30d' }));

  // Handle all other requests with Angular SSR
  app.get('**', angularSsrMiddleware(bootstrap));

  metricsApp.use(
    Router().use('/healthy', createHealthRouter()), // Health check endpoint
  );

  return { app, metricsApp };
}
