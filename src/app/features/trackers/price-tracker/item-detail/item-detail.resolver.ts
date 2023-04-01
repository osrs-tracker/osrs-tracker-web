import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { catchError, of } from 'rxjs';
import { OsrsTrackerRepo } from 'src/app/services/repositories/osrs-tracker.repo';

export const itemDetailResolver: ResolveFn<Item | null> = (route: ActivatedRouteSnapshot) =>
  inject(OsrsTrackerRepo)
    .getItemInfo(route.params['id'])
    .pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) return of(null);
        throw err;
      }),
    );
