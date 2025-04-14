import { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { serverConfig } from '../server-config';

export function rateLimitMiddleware(): RequestHandler {
  return rateLimit({
    windowMs: serverConfig.RATE_LIMIT_WINDOW_MS,
    max: serverConfig.RATE_LIMIT_MAX,
    standardHeaders: true, // Return rate limit info in RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
  });
}
