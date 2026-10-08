import { RequestHandler } from 'express';

// File types the production build emits (plus source maps). No route ends in one: item ids are numeric and RuneScape
// names can't contain a `.`.
const ASSET_PATH = /\.(?:js|mjs|css|map|woff2|png|gif)$/i;

/**
 * Answers asset paths the static middleware didn't find with a plain 404 before they reach Angular.
 * Some crawlers ignore `<base href="/">` and request `/trackers/price/chunk-*.js`, which would otherwise render as a
 * player or item page and call the API with the filename. Register it after `express.static`, so real assets are served.
 * Deliberately not a redirect to the root path: with the 30-day cache, a stale bundle name would get an old or wrong file.
 */
export function missingAssetMiddleware(): RequestHandler {
  return (req, res, next) => {
    if (ASSET_PATH.test(req.path)) {
      res.status(404).send('Not Found');
      return;
    }
    next();
  };
}
