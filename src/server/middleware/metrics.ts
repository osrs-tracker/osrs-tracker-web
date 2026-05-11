import { Express, RequestHandler } from 'express';
import promBundle from 'express-prom-bundle';
import { Express as MetricsExpress } from 'express-serve-static-core';
import { register } from 'prom-client';

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
