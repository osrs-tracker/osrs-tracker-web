import { RequestHandler } from 'express';
import { pageCache } from '../utils/page-cache';
import { applyCspNonce } from './csp-nonce';

/**
 * Express middleware for handling Angular SSR rendering
 */
export function angularCacheMiddleware(): RequestHandler {
  return (req, res, next) => {
    if (/\.[^/]+$/.test(req.path)) {
      // Files (anything with an extension) are left to the static middleware and its cache headers
      return next();
    }

    // Revalidated on every load, but not `no-store`: that keeps pages out of the back/forward cache in Firefox and
    // Safari, so Back would reload them instead of restoring them. The CSP nonce doesn't need it: a restored page keeps
    // the DOM its own CSP header matched.
    res.appendHeader('Cache-Control', 'no-cache');

    // Check if the page is in cache first, pages are keyed by path (without query params).
    // The host is not part of the key: the cache only contains pages pre-rendered by the auto generator for the
    // configured HOST, so it's safe to serve them regardless of the request's host header.
    const cachedPage = pageCache.get(req.path);

    if (cachedPage) {
      res.appendHeader('x-cache', 'HIT');
      return res.send(applyCspNonce(cachedPage, res));
    }
    res.appendHeader('x-cache', 'MISS');

    return next();
  };
}
