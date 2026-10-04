import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * `catchError` handler for page resolvers: a 400/404 shows the not-found page, any other failure (5xx, network) the
 * error page. Both keep `url` in the address bar, so a refresh or the error page's retry loads the page again. Call it
 * synchronously in the resolver, as it injects.
 */
export function resolverErrorHandler(url: string): (err: unknown) => never {
  const loc = inject(Location);
  const router = inject(Router);

  return (err: unknown) => {
    const notFound = err instanceof HttpErrorResponse && [400, 404].includes(err.status);

    router.navigate([notFound ? '**' : '/error']).then(() => {
      if (router.url !== url) loc.replaceState(url);
    });
    throw err;
  };
}
