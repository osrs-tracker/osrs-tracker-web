import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, Observable, of } from 'rxjs';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { resolverErrorHandler } from '@app/core/routing/resolver-error';
import { RecentItem } from '../price-tracker-store';
import { isBrowseLetter } from './browse-letters';

/** `null` for a letter there's no page for, so the page shows its not-found state without asking the API. */
export const browseItemsResolver: ResolveFn<RecentItem[] | null> = (
  route: ActivatedRouteSnapshot,
): Observable<RecentItem[] | null> => {
  const letter: string = route.params['letter'];
  if (!isBrowseLetter(letter)) return of(null);

  const handleError = resolverErrorHandler('/trackers/price/browse/' + encodeURIComponent(letter));
  return inject(OsrsTrackerRepo).getItemsByLetter(letter).pipe(catchError(handleError));
};
