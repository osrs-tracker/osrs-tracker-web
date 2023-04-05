import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { catchError } from 'rxjs';
import { OsrsTrackerRepo } from 'src/app/services/repositories/osrs-tracker.repo';

export const playerDetailResolver: ResolveFn<Player | null> = (route: ActivatedRouteSnapshot) => {
  const loc = inject(Location);
  const router = inject(Router);
  const osrsTrackerRepo = inject(OsrsTrackerRepo);

  return osrsTrackerRepo.getPlayerInfo(route.params['username'], false, true).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 404) {
        router.navigate(['**'], { skipLocationChange: true }).then(() => {
          if (router.url !== '/tracker/xp/' + route.params['username'])
            loc.replaceState('/tracker/xp/' + route.params['username']);
        });
      }
      throw err;
    }),
  );
};
