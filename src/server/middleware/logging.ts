import { Request, RequestHandler, Response } from 'express';
import morgan from 'morgan';
import { IncomingMessage } from 'node:http';
import { routeLabel } from '../utils/route-label';

export function loggingMiddleware(): RequestHandler {
  // morgan's response-time and total-time both need the headers to have been sent, so aborts are timed here
  const startTimes = new WeakMap<IncomingMessage, number>();

  const logger = morgan((tokens, req, res) => {
    // The client closed the connection before the headers were sent: there's no status, and nothing failed on our side
    const aborted = !res.headersSent;
    const status = res.statusCode;

    return JSON.stringify({
      level: aborted ? 'warn' : status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
      time: tokens['date'](req, res, 'iso'),
      status: tokens['status'](req, res),
      aborted: aborted || undefined,
      method: tokens['method'](req, res),
      host: tokens['req'](req, res, 'host'),
      route: routeLabel(req as Request, res as Response),
      url: tokens['url'](req, res),
      // For an abort: how long the client waited before closing the connection
      responseTime:
        (aborted ? (performance.now() - startTimes.get(req)!).toFixed(3) : tokens['response-time'](req, res)) + 'ms',
      cache: tokens['res'](req, res, 'x-cache'),
      userAgent: tokens['user-agent'](req, res),
      clientIp: tokens['remote-addr'](req, res),
      referer: tokens['referrer'](req, res),
      contentLength: tokens['res'](req, res, 'content-length'),
    });
  });

  return (req, res, next) => {
    startTimes.set(req, performance.now());
    logger(req, res, next);
  };
}
