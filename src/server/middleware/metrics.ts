import { Express, Request, RequestHandler } from 'express';
import promBundle from 'express-prom-bundle';
import { register } from 'prom-client';
import { routeLabel } from '../utils/route-label';

// Typed from promBundle itself, it ships its own (Express 5) types while the server uses Express 4
type MetricsExpress = NonNullable<NonNullable<Parameters<typeof promBundle>[0]>['metricsApp']>;

const normalizePath: promBundle.NormalizePathFn = req => {
  const expressReq = req as unknown as Request;
  return routeLabel(expressReq, expressReq.res!);
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
