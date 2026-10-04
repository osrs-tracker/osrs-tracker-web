import { AngularNodeAppEngine, createNodeRequestHandler, writeResponseToNodeResponse } from '@angular/ssr/node';
import compression from 'compression';
import express, { NextFunction, Request, Response, Router } from 'express';
import { angularCacheMiddleware } from './middleware/angular-cache';
import { applyCspNonce, cspNonceMiddleware } from './middleware/csp-nonce';
import { loggingMiddleware } from './middleware/logging';
import { metricsMiddleware } from './middleware/metrics';
import { protocolRelativeMiddleware } from './middleware/protocol-relative';
import { securityMiddleware } from './middleware/security';
import { createHealthRouter } from './routers/health';
import { createNoCacheHeadersRouter } from './routers/no-cache-files';
import { serverConfig } from './server-config';

export function createApp() {
  const app = express();
  // Traefik is the only hop in front of the app and overwrites any client-sent X-Forwarded-For, so req.ip is the client
  app.set('trust proxy', 1);
  const metricsApp = express();
  const angularApp = new AngularNodeAppEngine({
    allowedHosts: [serverConfig.HOST],
    trustProxyHeaders: serverConfig.TRUST_PROXY_HEADERS,
  });

  // Readiness probe on the main port, before logging and metrics so probes don't show up in either
  app.use('/healthy', createHealthRouter());

  app.use(
    metricsMiddleware(metricsApp), // Set up Monitoring
    loggingMiddleware(), // Add request logging
    cspNonceMiddleware(), // Generate a CSP nonce for this response
    securityMiddleware(), // Add security headers
    protocolRelativeMiddleware(), // 404 for `//host` paths, which Angular SSR rejects with an error
    compression(), // Add compression for better performance
    createNoCacheHeadersRouter(), // No-cache headers for critical static files
    angularCacheMiddleware(), // Cache rendered pages in memory for faster subsequent responses
  );

  app.use(express.static(serverConfig.browserDistFolder, { maxAge: '30d' }));

  app.use('*', (req, res, next) => {
    angularApp
      .handle(req)
      .then(async response => {
        if (!response) return next();
        if (!response.headers.get('content-type')?.startsWith('text/html'))
          return writeResponseToNodeResponse(response, res);

        // Pages get the response's CSP nonce, which changes their length
        const html = applyCspNonce(await response.text(), res);
        const headers = new Headers(response.headers);
        headers.delete('content-length');
        return writeResponseToNodeResponse(new globalThis.Response(html, { status: response.status, headers }), res);
      })
      .catch(next);
  });

  // Log errors and respond with a generic 500, Express' default handler leaks the stack trace unless NODE_ENV=production
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err);
    if (res.headersSent) return next(err);
    res.status(500).send('Internal Server Error');
  });

  metricsApp.use(
    Router().use('/healthy', createHealthRouter()), // Health check endpoint
  );

  return { app, metricsApp, angularApp, reqHandler: createNodeRequestHandler(app) };
}
