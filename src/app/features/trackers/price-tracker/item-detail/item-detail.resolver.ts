import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { catchError, forkJoin } from 'rxjs';
import { AveragePricesAtTime, LatestPrices, OsrsPricesRepo, TimeSpan } from 'src/app/repositories/osrs-prices.repo';
import { OsrsTrackerRepo } from 'src/app/repositories/osrs-tracker.repo';

export const itemDetailResolver: ResolveFn<[Item, LatestPrices, number, AveragePricesAtTime[]] | null> = (
  route: ActivatedRouteSnapshot,
) => {
  const loc = inject(Location);
  const router = inject(Router);
  const osrsTrackerRepo = inject(OsrsTrackerRepo);
  const osrsPricesRepo = inject(OsrsPricesRepo);

  return forkJoin([
    osrsTrackerRepo.getItemInfo(route.params['id'], { loadingIndicator: true }),
    osrsPricesRepo.getLatestPrices(route.params['id'], { loadingIndicator: true }),
    osrsPricesRepo.getVolume(route.params['id'], { loadingIndicator: true }),
    osrsPricesRepo.getPriceTimeSeries(route.params['id'], TimeSpan.FIVE_MINUTES, { loadingIndicator: true }),
  ]).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 404) {
        router.navigate(['**'], { skipLocationChange: true }).then(() => {
          if (router.url !== '/tracker/price/' + route.params['id'])
            loc.replaceState('/tracker/price/' + route.params['id']);
        });
      }
      throw err;
    }),
  );
};
