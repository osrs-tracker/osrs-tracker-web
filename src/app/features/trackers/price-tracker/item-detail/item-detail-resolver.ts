import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { catchError, Observable, of, throwError } from 'rxjs';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { PRICE_WORLD, priceTrackerPath } from '@app/common/api/price-world';
import { isNotFound, resolverErrorHandler } from '@app/core/routing/resolver-error';

/** Prices load on the page itself, behind skeletons, not here. */
export const itemDetailResolver: ResolveFn<Item | null> = (route: ActivatedRouteSnapshot) => {
  const handleError = resolverErrorHandler(`${priceTrackerPath(inject(PRICE_WORLD))}/${route.params['id']}`);

  return inject(OsrsTrackerRepo)
    .getItemInfo(route.params['id'], { loadingIndicator: true })
    .pipe(
      catchError((err: unknown): Observable<null> => (isNotFound(err) ? of(null) : throwError(() => err))),
      catchError(handleError),
    );
};
