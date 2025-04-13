/* eslint-disable no-console */
import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import compression from 'compression';
import express from 'express';
import promBundle from 'express-prom-bundle';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

const app = express();
const commonEngine = new CommonEngine();

// Set up Monitoring
app.use(
  promBundle({
    includeMethod: true,
    includePath: true,
    includeStatusCode: true,
    metricsPath: '/metrics',
  }) as unknown as express.RequestHandler,
);

// Health check endpoint
app.get('/healthy', (req, res) => res.status(200).send('OK'));

// Add request logging
app.use(
  morgan((tokens, req, res) =>
    JSON.stringify({
      method: tokens['method'](req, res),
      url: tokens['url'](req, res),
      status: tokens['status'](req, res),
      responseTime: tokens['response-time'](req, res) + 'ms',
      ip: req.ip, // Logs client's IP address
      userAgent: req.headers['user-agent'], // Logs user agent
    }),
  ),
);

// Add security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://www.googletagmanager.com'],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: [
          "'self'",
          'data:',
          'https://www.googletagmanager.com',
          'https://cdn.runescape.com',
          'https://oldschool.runescape.wiki',
        ],
        connectSrc: [
          "'self'",
          'data:',
          'https://www.googletagmanager.com',
          'https://*.google-analytics.com',
          'https://*.freekmencke.com',
          'https://raw.githubusercontent.com',
          'https://cdn.runescape.com',
          'https://oldschool.runescape.wiki',
          'https://prices.runescape.wiki',
        ],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        workerSrc: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xContentTypeOptions: true,
    xDnsPrefetchControl: { allow: true },
  }),
);

// Add compression for better performance
app.use(compression());

// Add rate limiting to prevent abuse
app.use(
  rateLimit({
    windowMs: Number(process.env['RATE_LIMIT_WINDOW_MS'] || 15 * 60 * 1000),
    max: Number(process.env['RATE_LIMIT_MAX'] || 500),
    standardHeaders: true, // Return rate limit info in RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
  }),
);

// Serve static files with no caching for specific files
['/ngsw.json', '/ngsw-worker.js', '/manifest.webmanifest', '/sitemap.xml', '/robots.txt'].forEach(file => {
  app.get(file, (req, res, next) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    // This is a temporary fix for the ngsw-worker.js file
    if (file === '/ngsw-worker.js') {
      return res.sendFile(join(browserDistFolder, 'safety-worker.js'));
    }
    next();
  });
});

// Serve static files first
app.use(express.static(browserDistFolder, { maxAge: '30d' }));

// Handle all other requests by rendering the Angular application.
app.get('**', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers } = req;

  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
    .then(html => res.send(html))
    .catch(err => next(err));
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 8080;
  const server = app.listen(port, () => console.log(`Node Express server listening on http://localhost:${port}`));

  // Handle graceful shutdown
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
      console.log(`Received ${signal}, shutting down gracefully`);
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

export default app;
