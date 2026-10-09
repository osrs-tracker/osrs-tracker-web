import express, { RequestHandler } from 'express';
import { relative, sep } from 'node:path';
import { serverConfig } from '../server-config';

// The build hashes the names of the bundles it writes to the root (`main-*.js`, `chunk-*.js`, `styles-*.css`), so a
// changed bundle gets a new URL and an old one never changes
const HASHED_FILE = /^\/[^/]+\.(?:js|css)$/;

/**
 * Serves the browser build. Hashed bundles are cached for a year, the files in `noCacheStaticFiles` are revalidated on
 * every use, and everything else (icons, favicons, the font) for a day, after which the browser revalidates it with the
 * ETag. Compression is left to Traefik (`osrs-tracker-web.yaml`).
 */
export function staticFilesMiddleware(): RequestHandler {
  return express.static(serverConfig.browserDistFolder, {
    cacheControl: false,
    setHeaders: (res, path) => {
      const url = '/' + relative(serverConfig.browserDistFolder, path).split(sep).join('/');

      if (serverConfig.noCacheStaticFiles.includes(url)) res.setHeader('Cache-Control', 'no-cache');
      else if (HASHED_FILE.test(url)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      else res.setHeader('Cache-Control', 'public, max-age=86400');
    },
  });
}
