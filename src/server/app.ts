import { AngularNodeAppEngine, createNodeRequestHandler, writeResponseToNodeResponse } from '@angular/ssr/node';
import { requestLogger, type Logger } from '@osrs-tracker/logger';
import express, { NextFunction, Request, Response, Router } from 'express';
import { angularCacheMiddleware } from './middleware/angular-cache';
import { applyCspNonce, cspNonceMiddleware } from './middleware/csp-nonce';
import { metricsMiddleware } from './middleware/metrics';
import { missingAssetMiddleware } from './middleware/missing-asset';
import { protocolRelativeMiddleware } from './middleware/protocol-relative';
import { securityMiddleware } from './middleware/security';
import { staticFilesMiddleware } from './middleware/static-files';
import { createHealthRouter } from './routers/health';
import { serverConfig } from './server-config';
import { logger as serverLogger, renderingPage, type WebLogType } from './utils/log';
import { routeLabel } from './utils/route-label';

/**
 * @param isReady Whether the readiness probe (`/healthy` on the main port) answers 200 yet
 * @param logger Where the request log and errors go, stdout unless a spec passes its own
 */
export function createApp({
  isReady = () => true,
  logger = serverLogger,
}: { isReady?: () => boolean; logger?: Logger } = {}) {
  const app = express();
  // Traefik is the only hop in front of the app and overwrites any client-sent X-Forwarded-For, so req.ip is the client
  app.set('trust proxy', 1);
  // Pages are `no-store` and their nonce changes every response, so an ETag is never used. Static files keep theirs.
  app.set('etag', false);
  const metricsApp = express();
  const angularApp = new AngularNodeAppEngine({
    allowedHosts: [serverConfig.HOST],
    trustProxyHeaders: serverConfig.TRUST_PROXY_HEADERS,
  });

  // Readiness probe on the main port, before logging and metrics so probes don't show up in either
  app.use('/healthy', createHealthRouter(isReady));

  app.use(
    metricsMiddleware(metricsApp), // Set up Monitoring
    // Add request logging
    requestLogger({
      logger,
      route: routeLabel,
      // Only once the headers were sent: an aborted request has no cache field
      fields: (_req, res) => ({ cache: res.headersSent ? res.getHeader('x-cache') : undefined }),
    }),
    cspNonceMiddleware(), // Generate a CSP nonce for this response
    securityMiddleware(), // Add security headers
    protocolRelativeMiddleware(), // 404 for `//host` paths, which Angular SSR rejects with an error
    angularCacheMiddleware(), // Cache rendered pages in memory for faster subsequent responses
  );

  app.use(staticFilesMiddleware());
  // After the static files, so only missing assets get a 404 instead of being rendered as a page
  app.use(missingAssetMiddleware());

  // Express 5 passes a rejected promise on to the error handler below
  app.use(async (req, res, next) => {
    const response = await renderingPage(req.path, () => angularApp.handle(req));
    if (!response) return next();
    if (!response.headers.get('content-type')?.startsWith('text/html'))
      return writeResponseToNodeResponse(response, res);

    // Pages get the response's CSP nonce, which changes their length
    const html = applyCspNonce(await response.text(), res);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    return writeResponseToNodeResponse(new globalThis.Response(html, { status: response.status, headers }), res);
  });

  // Log errors and respond with a generic 500, Express' default handler leaks the stack trace unless NODE_ENV=production
  const uncaughtLog = logger.child({ type: 'uncaught' satisfies WebLogType });
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    uncaughtLog.error({ error: err }, `${req.method} ${req.originalUrl} failed`);
    if (res.headersSent) return next(err);
    res.status(500).send('Internal Server Error');
  });

  metricsApp.use(
    Router().use('/healthy', createHealthRouter()), // Health check endpoint
  );

  return { app, metricsApp, angularApp, reqHandler: createNodeRequestHandler(app) };
}
