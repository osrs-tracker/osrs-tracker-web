import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { OsrsTrackerRepo } from 'src/app/services/repositories/osrs-tracker.repo';

export const itemDetailTitleResolver: ResolveFn<string> = (route: ActivatedRouteSnapshot) =>
  inject(OsrsTrackerRepo)
    .getItemInfo(route.params['id'])
    .pipe(
      map(item => `${item.name} - Price Tracker - OSRS Tracker`),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) return of('404 Not Found - Price Tracker - OSRS Tracker');
        throw err;
      }),
    );
