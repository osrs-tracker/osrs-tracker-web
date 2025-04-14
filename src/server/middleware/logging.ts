import { RequestHandler } from 'express';
import morgan from 'morgan';

export function loggingMiddleware(): RequestHandler {
  return morgan((tokens, req, res) =>
    JSON.stringify({
      method: tokens['method'](req, res),
      url: tokens['url'](req, res),
      status: tokens['status'](req, res),
      responseTime: tokens['response-time'](req, res) + 'ms',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      cached: res.getHeader('x-cache'),
    }),
  );
}
