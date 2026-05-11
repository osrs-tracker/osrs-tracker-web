import { RequestHandler } from 'express';
import { pageCache } from '../utils/page-cache';

/**
 * Express middleware for handling Angular SSR rendering
 */
export function angularCacheMiddleware(): RequestHandler {
  return (req, res, next) => {
    if (/\.(json|js|map|css|png|webmanifest|woff2)$/i.test(req.url)) {
      // Don't cache static files
      return next();
    }

    const { originalUrl, headers } = req;
    const fullUrl = `//${headers.host}${originalUrl}`;

    // Set no-cache headers because this returns the "index.html" file
    res.appendHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    // Check if the page is in cache first.
    const url = new URL(`https:${fullUrl}`); // Make an url to easily strip query params
    const cachedPage = pageCache.get(`//${url.host}${url.pathname}`);

    if (cachedPage) {
      res.appendHeader('x-cache', 'HIT');
      return res.send(cachedPage);
    }
    res.appendHeader('x-cache', 'MISS');

    return next();
  };
}
