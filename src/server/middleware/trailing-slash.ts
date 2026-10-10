import { RequestHandler } from 'express';

const TRAILING_SLASHES = /\/+$/;
// A path on this host: one `/`, not followed by another `/` or `\`, which browsers resolve to another host
const SAME_HOST_PATH = /^\/(?![/\\])/;

/**
 * Redirects paths with a trailing slash to the path without it (301), keeping the query string.
 * Otherwise `/about/terms/` renders the same page as `/about/terms` and misses the page cache, which is keyed by path.
 * Register it after `protocolRelativeMiddleware`, so `//host/` paths keep their 404.
 * Deliberately not Express' strict routing: the redirect has to happen before the page cache and SSR.
 */
export function trailingSlashMiddleware(): RequestHandler {
  return (req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path === '/' || !req.path.endsWith('/')) return next();

    const path = req.path.replace(TRAILING_SLASHES, '');
    // Never an open redirect: a target like `//host` or `/\host` falls through to the next middleware instead
    if (!SAME_HOST_PATH.test(path)) return next();

    const queryStart = req.originalUrl.indexOf('?');
    res.redirect(301, queryStart === -1 ? path : path + req.originalUrl.slice(queryStart));
  };
}
