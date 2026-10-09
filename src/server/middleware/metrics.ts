import { metricsMiddleware as expressMetrics } from '@osrs-tracker/express-metrics';
import { Express, RequestHandler } from 'express';
import { routeLabel } from '../utils/route-label';

export function metricsMiddleware(metricsApp: Express): RequestHandler {
  return expressMetrics({ metricsApp, normalizePath: routeLabel });
}
