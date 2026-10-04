import { Request, RequestHandler, Response } from 'express';
import morgan from 'morgan';
import { routeLabel } from '../utils/route-label';

export function loggingMiddleware(): RequestHandler {
  return morgan((tokens, req, res) => {
    const isError = Number(tokens['status'](req, res) ?? 500) >= 500;
    const isWarn = Number(tokens['status'](req, res) ?? 400) >= 400;

    return JSON.stringify({
      level: isError ? 'error' : isWarn ? 'warn' : 'info',
      time: tokens['date'](req, res, 'iso'),
      status: tokens['status'](req, res),
      method: tokens['method'](req, res),
      host: tokens['req'](req, res, 'host'),
      route: routeLabel(req as Request, res as Response),
      url: tokens['url'](req, res),
      responseTime: tokens['response-time'](req, res) + 'ms',
      cache: tokens['res'](req, res, 'x-cache'),
      userAgent: tokens['user-agent'](req, res),
      clientIp: tokens['remote-addr'](req, res),
      referer: tokens['referrer'](req, res),
      contentLength: tokens['res'](req, res, 'content-length'),
    });
  });
}
