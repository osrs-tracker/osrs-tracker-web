import { randomBytes } from 'node:crypto';
import { RequestHandler, Response } from 'express';

export function cspNonceMiddleware(): RequestHandler {
  return (req, res, next) => {
    res.locals['cspNonce'] = randomBytes(16).toString('base64');
    next();
  };
}

export function getCspNonce(res: Response): string {
  return res.locals['cspNonce'];
}

/**
 * `index.html` sets `ngCspNonce="CSP_NONCE_PLACEHOLDER"`. The build copies it onto the inline scripts and Angular's SSR
 * onto the scripts it adds (event replay, critical CSS), so rendered and cached pages contain the placeholder. Only
 * nonce attributes are replaced, so page content is never touched.
 */
export function applyCspNonce(html: string, res: Response): string {
  return html.replace(/\b(nonce|ngcspnonce)="CSP_NONCE_PLACEHOLDER"/gi, `$1="${getCspNonce(res)}"`);
}
