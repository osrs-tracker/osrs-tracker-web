import { RequestHandler } from 'express';
import { pageCache } from '../utils/page-cache';

/**
 * Express middleware for handling Angular SSR rendering
 */
export function angularCacheMiddleware(): RequestHandler {
  return (req, res, next) => {
    if (/\.[^/]+$/.test(req.path)) {
      // Files (anything with an extension) are left to the static middleware and its cache headers
      return next();
    }

    // Set no-cache headers because this returns the "index.html" file
    res.appendHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    // Check if the page is in cache first, pages are keyed by path (without query params).
    // The host is not part of the key: the cache only contains pages pre-rendered by the auto generator for the
    // configured HOST, so it's safe to serve them regardless of the request's host header.
    const cachedPage = pageCache.get(req.path);

    if (cachedPage) {
      res.appendHeader('x-cache', 'HIT');
      return res.send(cachedPage);
    }
    res.appendHeader('x-cache', 'MISS');

    return next();
  };
}
