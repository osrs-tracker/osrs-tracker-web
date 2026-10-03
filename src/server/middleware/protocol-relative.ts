import { RequestHandler } from 'express';

// Matches `//host` and `/\host`, which browsers and the WHATWG URL parser both resolve to another host
const PROTOCOL_RELATIVE_PATH = /^[/\\]{2}/;

/**
 * Answers protocol-relative paths with a plain 404 before they reach Angular.
 * Angular SSR rejects them (NG05702) to prevent host injection, which would otherwise surface as a 500.
 * Deliberately not a redirect to the collapsed path, redirecting to `//host` is an open redirect.
 */
export function protocolRelativeMiddleware(): RequestHandler {
  return (req, res, next) => {
    if (PROTOCOL_RELATIVE_PATH.test(req.originalUrl)) {
      res.status(404).send('Not Found');
      return;
    }
    next();
  };
}
