import { RequestHandler, Response } from 'express';
import type { ServerResponse } from 'node:http';
import helmet from 'helmet';
import { getCspNonce } from './csp-nonce';

/** The images pages name as `og:image`: link previews show them on other sites (`allowCrossOriginEmbedding`) */
export const LINK_PREVIEW_IMAGE = /^\/assets\/(?:og\/[^/]+|pwa\/icon-512x512\.png)$/;

/**
 * Lets other sites show this response, over helmet's `Cross-Origin-Resource-Policy: same-origin`: for link preview
 * images, which tools such as opengraph.xyz load straight into their page. Chat apps that fetch them on their own
 * servers ignore the header.
 */
export function allowCrossOriginEmbedding(res: ServerResponse): void {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
}

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
