import { Request, Response } from 'express';

// Angular renders every page through one catch-all Express route, so its routes are mapped here.
// Keep in sync with the routes in src/app.
const PAGE_ROUTES: [RegExp, string][] = [
  [/^\/$/, '/'],
  [/^\/trackers\/price$/, '/trackers/price'],
  [/^\/trackers\/price\/(high-alch|margins|new)$/, '/trackers/price/$1'],
  [/^\/trackers\/price\/browse$/, '/trackers/price/browse'],
  [/^\/trackers\/price\/browse\/[^/]+$/, '/trackers/price/browse/:letter'],
  [/^\/trackers\/price\/[^/]+$/, '/trackers/price/:id'],
  [/^\/trackers\/xp$/, '/trackers/xp'],
  [/^\/trackers\/xp\/[^/]+$/, '/trackers/xp/:username'],
  [/^\/players-online$/, '/players-online'],
  [/^\/news$/, '/news'],
  [/^\/about\/(changelog|privacy|terms)$/, '/about/$1'],
  [/^\/error$/, '/error'],
  // Built by the server (routers/sitemaps.ts), not static files: their own label, a 503 included
  [/^\/sitemap-(items|players)\.xml$/, '/sitemap-$1.xml'],
  // Drawn by the server (routers/og-images.ts), not static files: their own label, a 404 included
  [/^\/og\/item\/\d+\.png$/, '/og/item/:id.png'],
  [/^\/og\/player\/[^/]+\.png$/, '/og/player/:username.png'],
  [/^\/og\/players-online\.png$/, '/og/players-online.png'],
  // Answered by the server on the old host (routers/carry-over.ts)
  [/^\/carry-over$/, '/carry-over'],
];

/** Few values by design: every player name or hashed chunk would otherwise be its own Prometheus time series. */
export function routeLabel(req: Request, res: Response): string {
  // Prefixed instead of passed as a base, so a path like `//foo` isn't read as a host
  const { pathname } = new URL(`http://localhost${req.originalUrl || req.url}`);
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;

  for (const [pattern, route] of PAGE_ROUTES) {
    if (pattern.test(path)) return path.replace(pattern, route);
  }
  if (res.statusCode < 400 && /\.[^/]+$/.test(path)) return '/static';
  return '#unmatched';
}
