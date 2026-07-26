import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { catchError } from 'rxjs';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { XpTrackerStore } from '../xp-tracker.store';

export const playerDetailResolver: ResolveFn<Player | null> = (route: ActivatedRouteSnapshot) => {
  const loc = inject(Location);
  const router = inject(Router);
  const osrsTrackerRepo = inject(OsrsTrackerRepo);
  const xpTrackerStore = inject(XpTrackerStore);

  return osrsTrackerRepo
    .getPlayerInfo(route.params['username'], xpTrackerStore.scrapingOffset(), { loadingIndicator: true })
    .pipe(
      catchError((err: HttpErrorResponse) => {
        if ([400, 404].includes(err.status)) {
          router.navigate(['**']).then(() => {
            if (router.url !== '/tracker/xp/' + route.params['username'])
              loc.replaceState('/tracker/xp/' + route.params['username']);
          });
        }
        throw err;
      }),
    );
};
