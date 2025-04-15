import { ApplicationRef } from '@angular/core';
import { RequestHandler } from 'express';
import { join } from 'path';
import { serverConfig } from '../server-config';
import { renderWithSsr } from '../utils/angular-ssr';
import { pageCache } from '../utils/page-cache';

/**
 * Express middleware for handling Angular SSR rendering
 */
export function angularSsrMiddleware(bootstrap: () => Promise<ApplicationRef>): RequestHandler {
  return (req, res) => {
    const { originalUrl, headers } = req;
    const fullUrl = `//${headers.host}${originalUrl}`;

    // Check if the page is in cache first. (CACHE KEY IS ALWAYS HTTPS)
    const cachedPage = pageCache.get(fullUrl);
    if (cachedPage) {
      res.appendHeader('x-cache', 'HIT');
      return res.send(cachedPage);
    }

    res.appendHeader('x-cache', 'MISS');

    // Otherwise, render the page and cache it
    return renderWithSsr(bootstrap, fullUrl).then(html =>
      html ? res.send(html) : res.sendFile(join(serverConfig.browserDistFolder, 'index.csr.html')),
    ); // send normal non SSR index.html when SSR fails.
  };
}
