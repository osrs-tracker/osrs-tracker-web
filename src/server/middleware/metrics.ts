import { Express, RequestHandler } from 'express';
import promBundle from 'express-prom-bundle';
import { Express as MetricsExpress } from 'express-serve-static-core';

export function metricsMiddleware(metricsApp: Express): RequestHandler {
  return promBundle({
    includeMethod: true,
    includePath: true,
    includeStatusCode: true,
    metricsPath: '/metrics',
    metricsApp: metricsApp as unknown as MetricsExpress,
    autoregister: false,
  }) as unknown as RequestHandler;
}
