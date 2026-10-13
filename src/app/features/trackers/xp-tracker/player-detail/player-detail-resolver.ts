import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { catchError, map, of } from 'rxjs';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { isNotFound, resolverErrorHandler } from '@app/core/routing/resolver-error';
import { XpTrackerStore } from '../xp-tracker-store';

/**
 * The offset the player is resolved at, whatever the visitor's: the server can't read theirs (it's in localStorage), and
 * asking for the same URL lets the browser take the server's response from the transfer cache instead of asking again
 * before the page starts. Only `trackedSince` depends on the offset; the page's lookup returns the visitor's.
 */
const RESOLVED_OFFSET = 0;

/** The player, or `null` when there's no such player: the page then shows its own not-found state with a search. */
export const playerDetailResolver: ResolveFn<Player | null> = (route: ActivatedRouteSnapshot) => {
  const osrsTrackerRepo = inject(OsrsTrackerRepo);
  const xpTrackerStore = inject(XpTrackerStore);
  const errorHandler = resolverErrorHandler('/trackers/xp/' + route.params['username']);

  return osrsTrackerRepo.getPlayerInfo(route.params['username'], RESOLVED_OFFSET, { loadingIndicator: true }).pipe(
    // another offset's start isn't the visitor's: unknown until the lookup returns it
    map(player => (xpTrackerStore.scrapingOffset() === RESOLVED_OFFSET ? player : { ...player, trackedSince: null })),
    catchError(err => (isNotFound(err) ? of(null) : errorHandler(err))),
  );
};
