import { Express, RequestHandler } from 'express';
import promBundle from 'express-prom-bundle';
import { register } from 'prom-client';

// Typed from promBundle itself, it ships its own (Express 5) types while the server uses Express 4
type MetricsExpress = NonNullable<NonNullable<Parameters<typeof promBundle>[0]>['metricsApp']>;

export function metricsMiddleware(metricsApp: Express): RequestHandler {
  register.clear(); // Clear existing metrics to prevent duplication when hot-reloading
  return promBundle({
    includeMethod: true,
    includePath: true,
    includeStatusCode: true,
    metricsPath: '/metrics',
    metricsApp: metricsApp as unknown as MetricsExpress,
    autoregister: false,
  }) as unknown as RequestHandler;
}
