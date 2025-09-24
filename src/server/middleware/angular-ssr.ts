import { ApplicationRef } from '@angular/core';
import { RequestHandler } from 'express';
import { join } from 'path';
import { serverConfig } from '../server-config';
import { renderWithSsr } from '../utils/angular-ssr';
import { pageCache } from '../utils/page-cache';
import { BootstrapContext } from '@angular/platform-browser';

/**
 * Express middleware for handling Angular SSR rendering
 */
export function angularSsrMiddleware(
  bootstrap: (context: BootstrapContext) => Promise<ApplicationRef>,
): RequestHandler {
  return (req, res) => {
    const { originalUrl, headers } = req;
    const fullUrl = `//${headers.host}${originalUrl}`;

    // Set no-cache headers because this returns the "index.html" file
    res.appendHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    // Check if the page is in cache first. (CACHE KEY IS ALWAYS HTTPS)
    const url = new URL(`https:${fullUrl}`); // Make an url to easily strip query params
    const cachedPage = pageCache.get(`//${url.host}${url.pathname}`);
    if (cachedPage) {
      res.appendHeader('x-cache', 'HIT');
      return res.send(cachedPage);
    }
    res.appendHeader('x-cache', 'MISS');

    // Otherwise, render the page and cache it
    return renderWithSsr(bootstrap, fullUrl, res).then(html =>
      html ? res.send(html) : res.sendFile(join(serverConfig.browserDistFolder, 'index.csr.html')),
    ); // send normal non SSR index.html when SSR fails.
  };
}
