import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { catchError, of } from 'rxjs';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { isNotFound, resolverErrorHandler } from '@app/core/routing/resolver-error';
import { XpTrackerStore } from '../xp-tracker-store';

/** The player, or `null` when there's no such player: the page then shows its own not-found state with a search. */
export const playerDetailResolver: ResolveFn<Player | null> = (route: ActivatedRouteSnapshot) => {
  const osrsTrackerRepo = inject(OsrsTrackerRepo);
  const xpTrackerStore = inject(XpTrackerStore);
  const errorHandler = resolverErrorHandler('/trackers/xp/' + route.params['username']);

  return osrsTrackerRepo
    .getPlayerInfo(route.params['username'], xpTrackerStore.scrapingOffset(), { loadingIndicator: true })
    .pipe(catchError(err => (isNotFound(err) ? of(null) : errorHandler(err))));
};
