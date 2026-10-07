import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { catchError, Observable, of, throwError } from 'rxjs';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { resolverErrorHandler } from 'src/app/core/routing/resolver-error';

/**
 * The item, or `null` when there's no such item (the page shows its not-found state in place). Prices load on the page
 * itself, behind skeletons. Other failures show the error page.
 */
export const itemDetailResolver: ResolveFn<Item | null> = (route: ActivatedRouteSnapshot) => {
  const handleError = resolverErrorHandler('/trackers/price/' + route.params['id']);

  return inject(OsrsTrackerRepo)
    .getItemInfo(route.params['id'], { loadingIndicator: true })
    .pipe(
      catchError((err: unknown): Observable<null> => {
        const notFound = err instanceof HttpErrorResponse && [400, 404].includes(err.status);
        return notFound ? of(null) : throwError(() => err);
      }),
      catchError(handleError),
    );
};
