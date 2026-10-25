import express, { Router } from 'express';

/**
 * The route's `redirectTo` (kept for client-side navigation) is a 302 on the server, which search engines treat as
 * temporary. Register this before `trailingSlashMiddleware`, so `/trackers/price/browse/` gets there in one hop (Express
 * routing isn't strict), and before the page cache, whose headers would make browsers revalidate the 301.
 */
export function createRedirectRouter(): Router {
  const router = express.Router();

  router.get('/trackers/price/browse', (req, res) => {
    const queryStart = req.originalUrl.indexOf('?');
    res.redirect(301, '/trackers/price/browse/a' + (queryStart === -1 ? '' : req.originalUrl.slice(queryStart)));
  });

  return router;
}
