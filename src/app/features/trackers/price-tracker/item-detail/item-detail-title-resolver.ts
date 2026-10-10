import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';

export const itemDetailTitleResolver: ResolveFn<string> = (route: ActivatedRouteSnapshot) =>
  inject(OsrsTrackerRepo)
    .getItemInfo(route.params['id'], { loadingIndicator: true })
    .pipe(
      map(item => `${item.name} - Price Tracker - OSRS Tracker`),
      catchError((err: unknown) =>
        of(
          err instanceof HttpErrorResponse && [400, 404].includes(err.status)
            ? 'Item not found - Price Tracker - OSRS Tracker'
            : 'Price Tracker - OSRS Tracker',
        ),
      ),
    );
