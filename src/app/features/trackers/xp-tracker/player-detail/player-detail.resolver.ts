import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { catchError } from 'rxjs';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { resolverErrorHandler } from 'src/app/core/routing/resolver-error';
import { XpTrackerStore } from '../xp-tracker.store';

export const playerDetailResolver: ResolveFn<Player | null> = (route: ActivatedRouteSnapshot) => {
  const osrsTrackerRepo = inject(OsrsTrackerRepo);
  const xpTrackerStore = inject(XpTrackerStore);

  return osrsTrackerRepo
    .getPlayerInfo(route.params['username'], xpTrackerStore.scrapingOffset(), { loadingIndicator: true })
    .pipe(catchError(resolverErrorHandler('/trackers/xp/' + route.params['username'])));
};
