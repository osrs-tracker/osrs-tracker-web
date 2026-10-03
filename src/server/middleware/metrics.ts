import { Express, RequestHandler } from 'express';
import promBundle from 'express-prom-bundle';
import { register } from 'prom-client';
import UrlValueParser from 'url-value-parser';

// Typed from promBundle itself, it ships its own (Express 5) types while the server uses Express 4
type MetricsExpress = NonNullable<NonNullable<Parameters<typeof promBundle>[0]>['metricsApp']>;

const urlValueParser = new UrlValueParser();

/**
 * Same path label as promBundle's default normalizePath, but parsed with the WHATWG URL API.
 * The default uses `url.parse()`, which logs a DEP0169 deprecation warning on Node 24.
 */
const normalizePath: promBundle.NormalizePathFn = req => {
  // Prefixed instead of passed as a base, so a path like `//foo` isn't read as a host
  const { pathname } = new URL(`http://localhost${req.originalUrl || req.url}`);
  return urlValueParser.replacePathValues(pathname, '#val');
};

export function metricsMiddleware(metricsApp: Express): RequestHandler {
  register.clear(); // Clear existing metrics to prevent duplication when hot-reloading
  return promBundle({
    includeMethod: true,
    includePath: true,
    includeStatusCode: true,
    normalizePath,
    metricsPath: '/metrics',
    metricsApp: metricsApp as unknown as MetricsExpress,
    autoregister: false,
  }) as unknown as RequestHandler;
}
