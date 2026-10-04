import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { catchError, forkJoin } from 'rxjs';
import {
  AveragePricesAtTime,
  LatestPrices,
  OsrsPricesRepo,
  TimeSpan,
} from 'src/app/common/repositories/osrs-prices.repo';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { resolverErrorHandler } from 'src/app/core/routing/resolver-error';

export const itemDetailResolver: ResolveFn<[Item, LatestPrices, number, AveragePricesAtTime[]] | null> = (
  route: ActivatedRouteSnapshot,
) => {
  const osrsTrackerRepo = inject(OsrsTrackerRepo);
  const osrsPricesRepo = inject(OsrsPricesRepo);

  return forkJoin([
    osrsTrackerRepo.getItemInfo(route.params['id'], { loadingIndicator: true }),
    osrsPricesRepo.getLatestPrices(route.params['id'], { fetchSingle: true, loadingIndicator: true }),
    osrsPricesRepo.getVolume(route.params['id'], { loadingIndicator: true }),
    osrsPricesRepo.getPriceTimeSeries(route.params['id'], TimeSpan.FIVE_MINUTES, { loadingIndicator: true }),
  ]).pipe(catchError(resolverErrorHandler('/trackers/price/' + route.params['id'])));
};
