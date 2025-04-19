import { RequestHandler } from 'express';
import morgan from 'morgan';

export function loggingMiddleware(): RequestHandler {
  return morgan((tokens, req, res) =>
    JSON.stringify({
      level: Number(tokens['status'](req, res) ?? 500) >= 500 ? 'error' : 'log',
      time: tokens['date'](req, res, 'iso'),
      status: tokens['status'](req, res),
      method: tokens['method'](req, res),
      host: tokens['req'](req, res, 'host'),
      url: tokens['url'](req, res),
      responseTime: tokens['response-time'](req, res) + 'ms',
      cache: tokens['res'](req, res, 'x-cache'),
      userAgent: tokens['user-agent'](req, res),
    }),
  );
}
