import { RequestHandler } from 'express';
import promBundle from 'express-prom-bundle';

export function metricsMiddleware(): RequestHandler {
  return promBundle({
    includeMethod: true,
    includePath: true,
    includeStatusCode: true,
    metricsPath: '/metrics',
  }) as unknown as RequestHandler;
}
