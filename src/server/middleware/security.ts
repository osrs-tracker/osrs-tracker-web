import { RequestHandler, Response } from 'express';
import helmet from 'helmet';
import { getCspNonce } from './csp-nonce';

export function securityMiddleware(): RequestHandler {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Inline scripts need the response's nonce, see `applyCspNonce`
        scriptSrc: [
          "'self'",
          (req, res) => `'nonce-${getCspNonce(res as Response)}'`,
          'https://www.googletagmanager.com',
        ],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: [
          "'self'",
          'data:',
          'blob:', // pixel-art icons upscaled on a canvas by Icon
          'https://www.googletagmanager.com',
          'https://*.freekmencke.com',
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
        workerSrc: ["'none'"], // no service or web workers; set back to 'self' if the service worker returns
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xContentTypeOptions: true,
    xDnsPrefetchControl: { allow: true },
  });
}
