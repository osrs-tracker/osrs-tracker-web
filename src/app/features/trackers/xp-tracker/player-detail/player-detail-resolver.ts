import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { catchError, of } from 'rxjs';
import { OsrsTrackerRepo } from '@app/common/repositories/osrs-tracker-repo';
import { resolverErrorHandler } from '@app/core/routing/resolver-error';
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

/** A name that isn't on the hiscores (404) or can't be a player name (400) */
export function isNotFound(err: unknown): boolean {
  return err instanceof HttpErrorResponse && [400, 404].includes(err.status);
}
