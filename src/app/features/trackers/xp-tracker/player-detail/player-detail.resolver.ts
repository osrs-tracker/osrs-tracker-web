import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { catchError, of } from 'rxjs';
import { OsrsTrackerRepo } from 'src/app/services/repositories/osrs-tracker.repo';

export const playerDetailResolver: ResolveFn<Player | null> = (route: ActivatedRouteSnapshot) =>
  inject(OsrsTrackerRepo)
    .getPlayerInfo(route.params['username'])
    .pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) return of(null);
        throw err;
      }),
    );
