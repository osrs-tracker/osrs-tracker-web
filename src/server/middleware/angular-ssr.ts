import { ApplicationRef } from '@angular/core';
import { RequestHandler } from 'express';
import { renderWithSsr } from '../utils/angular-ssr';
import { pageCache } from '../utils/page-cache';

/**
 * Express middleware for handling Angular SSR rendering
 */
export function angularSsrMiddleware(bootstrap: () => Promise<ApplicationRef>): RequestHandler {
  return (req, res, next) => {
    const { protocol, originalUrl, headers } = req;
    const fullUrl = `${protocol}://${headers.host}${originalUrl}`;

    // Check if the page is in cache first. (CACHE KEY IS ALWAYS HTTPS)
    const cachedPage = pageCache.get(`https://${headers.host}${originalUrl}`);
    if (cachedPage) {
      res.appendHeader('x-cache', 'HIT');
      return res.send(cachedPage);
    }

    res.appendHeader('x-cache', 'MISS');

    // Otherwise, render the page and cache it
    return renderWithSsr(bootstrap, fullUrl)
      .then(html => {
        // Store in cache for future requests
        pageCache.set(fullUrl, html);
        res.send(html);
      })
      .catch(err => {
        // eslint-disable-next-line no-console
        console.error('Error during SSR:', err);
        next(err);
      });
  };
}
