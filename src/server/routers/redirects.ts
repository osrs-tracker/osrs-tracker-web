import express, { Router } from 'express';

/** Paths that moved for good, and where to. Angular's `redirectTo` on the same path answers with a 302. */
const PERMANENT_REDIRECTS: Record<string, string> = {
  '/trackers/price/browse': '/trackers/price/browse/a',
};

/**
 * Redirects the paths in `PERMANENT_REDIRECTS` with a 301, keeping the query string, before Angular renders them: an
 * Angular `redirectTo` is a 302 on the server, which search engines treat as temporary. The route keeps its
 * `redirectTo` for client-side navigation.
 */
export function createRedirectRouter(): Router {
  const router = express.Router();

  for (const [from, to] of Object.entries(PERMANENT_REDIRECTS)) {
    router.get(from, (req, res) => {
      const queryStart = req.originalUrl.indexOf('?');
      res.redirect(301, queryStart === -1 ? to : to + req.originalUrl.slice(queryStart));
    });
  }

  return router;
}
