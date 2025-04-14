import { RequestHandler } from 'express';
import helmet from 'helmet';

export function securityMiddleware(): RequestHandler {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://www.googletagmanager.com'],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: [
          "'self'",
          'data:',
          'https://www.googletagmanager.com',
          'https://cdn.runescape.com',
          'https://oldschool.runescape.wiki',
        ],
        connectSrc: [
          "'self'",
          'data:',
          'https://www.googletagmanager.com',
          'https://*.google-analytics.com',
          'https://*.freekmencke.com',
          'https://raw.githubusercontent.com',
          'https://cdn.runescape.com',
          'https://oldschool.runescape.wiki',
          'https://prices.runescape.wiki',
        ],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        workerSrc: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xContentTypeOptions: true,
    xDnsPrefetchControl: { allow: true },
  });
}
